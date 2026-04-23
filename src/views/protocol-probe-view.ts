import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { GatewayClient, ConnectionState } from "../gateway-client.js";

type ProbeKind = "rpc" | "chat";

type ProbeCase = {
  id: string;
  label: string;
  kind: ProbeKind;
  method?: string;
  params?: Record<string, unknown>;
  message?: string;
  description: string;
};

type ProbeResult = {
  id: string;
  ok: boolean;
  at: number;
  request: unknown;
  response?: unknown;
  error?: string;
};

@customElement("protocol-probe-view")
export class ProtocolProbeView extends LitElement {
  @property({ attribute: false }) client!: GatewayClient;
  @property({ type: String }) connectionState: ConnectionState = "disconnected";
  @property({ type: String }) sessionKey = "";

  @state() private runningId = "";
  @state() private results: ProbeResult[] = [];

  createRenderRoot() { return this; }

  private probeCases(): ProbeCase[] {
    const key = this.sessionKey;
    return [
      {
        id: "label",
        label: "Probe label",
        kind: "rpc",
        method: "sessions.patch",
        params: { key, label: "probe-label" },
        description: "Minimal sessions.patch sanity check.",
      },
      {
        id: "thinking",
        label: "Probe thinkingLevel",
        kind: "rpc",
        method: "sessions.patch",
        params: { key, thinkingLevel: "low" },
        description: "Checks whether session thinking level is supported.",
      },
      {
        id: "verbose",
        label: "Probe verboseLevel",
        kind: "rpc",
        method: "sessions.patch",
        params: { key, verboseLevel: "on" },
        description: "Checks whether verbose session overrides are supported.",
      },
      {
        id: "reasoning",
        label: "Probe reasoningLevel",
        kind: "rpc",
        method: "sessions.patch",
        params: { key, reasoningLevel: "on" },
        description: "Checks whether reasoning session overrides are supported.",
      },
      {
        id: "elevated",
        label: "Probe elevatedLevel",
        kind: "rpc",
        method: "sessions.patch",
        params: { key, elevatedLevel: "on" },
        description: "Checks whether elevated session overrides are supported.",
      },
      {
        id: "exec-host",
        label: "Probe execHost",
        kind: "rpc",
        method: "sessions.patch",
        params: { key, execHost: "gateway" },
        description: "Checks whether exec host routing can be patched per session.",
      },
      {
        id: "exec-security",
        label: "Probe execSecurity",
        kind: "rpc",
        method: "sessions.patch",
        params: { key, execSecurity: "allowlist" },
        description: "Checks whether exec security can be patched per session.",
      },
      {
        id: "exec-ask",
        label: "Probe execAsk",
        kind: "rpc",
        method: "sessions.patch",
        params: { key, execAsk: "off" },
        description: "Checks whether exec approval mode can be patched per session.",
      },
      {
        id: "chat-fast",
        label: "Probe /fast on",
        kind: "chat",
        message: "/fast on",
        description: "Tests slash-command based fast-mode switching.",
      },
      {
        id: "chat-reasoning",
        label: "Probe /reasoning on",
        kind: "chat",
        message: "/reasoning on",
        description: "Tests slash-command based reasoning switching.",
      },
      {
        id: "chat-elevated",
        label: "Probe /elevated full",
        kind: "chat",
        message: "/elevated full",
        description: "Tests slash-command based elevated mode switching.",
      },
      {
        id: "chat-autonomy",
        label: "Probe /autonomy help",
        kind: "chat",
        message: "/autonomy help",
        description: "Checks whether the remote gateway recognizes autonomy.",
      },
    ];
  }

  private async runProbe(probe: ProbeCase) {
    if (!this.client || this.connectionState !== "connected" || this.runningId) return;
    this.runningId = probe.id;
    const request =
      probe.kind === "rpc"
        ? { method: probe.method, params: probe.params }
        : { method: "chat.send", params: { sessionKey: this.sessionKey, message: probe.message, deliver: false, idempotencyKey: crypto.randomUUID() } };

    try {
      const response =
        probe.kind === "rpc"
          ? await this.client.request(probe.method!, probe.params)
          : await this.client.sendChat(probe.message!, this.sessionKey);
      this.results = [
        {
          id: probe.id,
          ok: true,
          at: Date.now(),
          request,
          response,
        },
        ...this.results.filter((entry) => entry.id !== probe.id),
      ];
    } catch (error) {
      this.results = [
        {
          id: probe.id,
          ok: false,
          at: Date.now(),
          request,
          error: error instanceof Error ? error.message : String(error),
        },
        ...this.results.filter((entry) => entry.id !== probe.id),
      ];
    } finally {
      this.runningId = "";
    }
  }

  private resultFor(id: string) {
    return this.results.find((entry) => entry.id === id);
  }

  render() {
    const probes = this.probeCases();
    return html`
      <div class="content">
        <div class="content__header">
          <h1 class="content__title">Protocol Probe</h1>
          <button class="btn btn--ghost btn--sm" @click=${() => { this.results = []; }}>
            Clear Results
          </button>
        </div>

        <div class="card">
          <h2 class="card__title">Current Session</h2>
          <div class="mc-row">
            <div class="mc-row__key">Session</div>
            <div class="mc-row__value">${this.sessionKey || "-"}</div>
          </div>
          <div class="mc-row">
            <div class="mc-row__key">Status</div>
            <div class="mc-row__value">${this.connectionState}</div>
          </div>
        </div>

        <div class="probe-grid">
          ${probes.map((probe) => {
            const result = this.resultFor(probe.id);
            return html`
              <div class="card probe-card">
                <div class="probe-card__header">
                  <div>
                    <div class="probe-card__title">${probe.label}</div>
                    <div class="probe-card__description">${probe.description}</div>
                  </div>
                  <button
                    class="btn btn--sm"
                    ?disabled=${this.connectionState !== "connected" || !!this.runningId}
                    @click=${() => this.runProbe(probe)}
                  >
                    ${this.runningId === probe.id ? "Running..." : "Run"}
                  </button>
                </div>

                ${result
                  ? html`
                      <div class="probe-result">
                        <div class="probe-result__meta">
                          <span class="badge ${result.ok ? "badge--ok" : "badge--danger"}">
                            ${result.ok ? "Supported" : "Rejected"}
                          </span>
                          <span class="probe-result__time">${new Date(result.at).toLocaleTimeString()}</span>
                        </div>
                        <details class="mc-details">
                          <summary>Request</summary>
                          <pre>${JSON.stringify(result.request, null, 2)}</pre>
                        </details>
                        ${result.response !== undefined
                          ? html`
                              <details class="mc-details">
                                <summary>Response</summary>
                                <pre>${typeof result.response === "string" ? result.response : JSON.stringify(result.response, null, 2)}</pre>
                              </details>
                            `
                          : nothing}
                        ${result.error
                          ? html`
                              <details class="mc-details" open>
                                <summary>Error</summary>
                                <pre>${result.error}</pre>
                              </details>
                            `
                          : nothing}
                      </div>
                    `
                  : nothing}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }
}
