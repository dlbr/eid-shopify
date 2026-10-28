import {createCustomerWalletSession, newWalletAttemptKey, pollCustomerWalletSession, type CustomerWalletSession} from './customer-wallet-client.ts';
import {walletState, type WalletState} from './wallet-state.ts';

type TokenProvider = {get(): Promise<string>};
interface Options { tokenProvider: TokenProvider; onChange: (state: WalletState, walletUri: string | null) => void; fetcher?: typeof fetch; now?: () => number; pollIntervalMs?: number; requestTimeoutMs?: number }

/** UI lifecycle only. Neither the local clock nor a result authorizes checkout. */
export class CustomerWalletController {
  private state: WalletState = {phase:'idle'};
  private session: CustomerWalletSession | null = null;
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private abort: AbortController | null = null;
  private readonly options: Options;
  constructor(options: Options) { this.options = options; }
  private now(): number { return (this.options.now ?? Date.now)(); }
  private publish(): void { this.options.onChange(this.state, this.state.phase === 'pending' ? this.session?.walletUri ?? null : null); }
  private clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null; this.abort?.abort(); this.abort = null; this.session = null;
  }
  cancel(): void { this.generation++; this.clear(); this.state = walletState(this.state, {type:'cancel'}); this.publish(); }
  reset(): void { this.generation++; this.clear(); this.state = {phase:'idle'}; this.publish(); }
  async start(): Promise<void> {
    if (this.state.phase !== 'idle') return;
    const generation = ++this.generation;
    const attempt = newWalletAttemptKey();
    const key = newWalletAttemptKey();
    this.state = walletState(this.state, {type:'start', attempt}); this.publish();
    try {
      const session = await this.withDeadline(signal => createCustomerWalletSession(this.options.tokenProvider, key, this.options.fetcher, signal));
      if (generation !== this.generation) return;
      this.session = session;
      this.state = walletState(this.state, {type:'created', attempt, expiresAt:session.expiresAt, now:this.now()});
      if (this.state.phase !== 'pending') this.clear();
      this.publish();
      if (this.state.phase === 'pending') this.schedule(generation, attempt);
    } catch {
      if (generation !== this.generation) return;
      this.clear(); this.state = walletState(this.state, {type:'error', attempt}); this.publish();
    }
  }
  private async withDeadline<T>(action: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController(); this.abort = controller;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([action(controller.signal), new Promise<never>((_, reject) => {
        timeout = setTimeout(() => { controller.abort(); reject(new Error('REQUEST_TIMEOUT')); }, this.options.requestTimeoutMs ?? 15000);
      })]);
    } finally { if (timeout !== undefined) clearTimeout(timeout); if (this.abort === controller) this.abort = null; }
  }
  private schedule(generation: number, attempt: string): void {
    if (!this.session) return;
    const delay = Math.max(0, Math.min(this.options.pollIntervalMs ?? 3000, this.session.expiresAt - this.now()));
    this.timer = setTimeout(() => { this.timer = null; void this.poll(generation, attempt); }, delay);
  }
  private async poll(generation: number, attempt: string): Promise<void> {
    if (generation !== this.generation || !this.session || this.state.phase !== 'pending') return;
    this.state = walletState(this.state, {type:'tick', attempt, now:this.now()});
    if (this.state.phase !== 'pending') { this.clear(); this.publish(); return; }
    try {
      const result = await this.withDeadline(signal => pollCustomerWalletSession(this.options.tokenProvider, this.session!, this.options.fetcher, signal));
      if (generation !== this.generation) return;
      this.state = walletState(this.state, {type:'status', attempt, status:result.status, now:this.now()});
      if (this.state.phase !== 'pending') this.clear();
      this.publish();
      if (this.state.phase === 'pending') this.schedule(generation, attempt);
    } catch {
      if (generation !== this.generation) return;
      this.clear(); this.state = walletState(this.state, {type:'error', attempt}); this.publish();
    }
  }
}
