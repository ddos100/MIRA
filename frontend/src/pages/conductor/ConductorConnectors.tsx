import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Database,
  Globe,
  Terminal,
  Webhook,
  Cpu,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { conductorApi, ConductorConnector, ConnectorCreateData } from "@/api/conductor";

// ─── Types ──────────────────────────────────────────────────────────────────────

type ConnectorType = ConductorConnector["connector_type"];

interface FormState {
  name: string;
  connector_type: ConnectorType;
  // db
  db_host: string;
  db_port: string;
  db_database: string;
  db_dialect: "postgresql" | "mysql" | "mssql" | "sqlite";
  db_username: string;
  db_password: string;
  // rest_api
  rest_base_url: string;
  rest_auth_type: "none" | "bearer" | "basic" | "api_key";
  rest_token: string;
  rest_username: string;
  rest_password: string;
  rest_api_key: string;
  // ssh
  ssh_host: string;
  ssh_port: string;
  ssh_username: string;
  ssh_auth_type: "password" | "private_key";
  ssh_password: string;
  ssh_private_key: string;
  // mira_api
  mira_base_url: string;
  mira_token: string;
}

const emptyForm = (): FormState => ({
  name: "",
  connector_type: "rest_api",
  db_host: "", db_port: "5432", db_database: "", db_dialect: "postgresql", db_username: "", db_password: "",
  rest_base_url: "", rest_auth_type: "none", rest_token: "", rest_username: "", rest_password: "", rest_api_key: "",
  ssh_host: "", ssh_port: "22", ssh_username: "", ssh_auth_type: "password", ssh_password: "", ssh_private_key: "",
  mira_base_url: "", mira_token: "",
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

function connectorTypeIcon(type: ConnectorType) {
  const props = { size: 15 };
  switch (type) {
    case "db": return <Database {...props} />;
    case "rest_api": return <Globe {...props} />;
    case "ssh": return <Terminal {...props} />;
    case "webhook": return <Webhook {...props} />;
    case "mira_api": return <Cpu {...props} />;
  }
}

function connectorTypeLabel(type: ConnectorType) {
  const map: Record<ConnectorType, string> = {
    db: "Database", rest_api: "REST API", ssh: "SSH", webhook: "Webhook", mira_api: "MIRA API",
  };
  return map[type];
}

function connectorTypeBadgeColor(type: ConnectorType) {
  const map: Record<ConnectorType, string> = {
    db: "bg-purple-100 text-purple-700",
    rest_api: "bg-blue-100 text-blue-700",
    ssh: "bg-gray-100 text-gray-700",
    webhook: "bg-orange-100 text-orange-700",
    mira_api: "bg-indigo-100 text-indigo-700",
  };
  return map[type];
}

function connectorToForm(c: ConductorConnector): FormState {
  const cfg = c.config ?? {};
  return {
    name: c.name,
    connector_type: c.connector_type,
    db_host: (cfg.host as string) ?? "",
    db_port: String((cfg.port as number) ?? 5432),
    db_database: (cfg.database as string) ?? "",
    db_dialect: (cfg.dialect as FormState["db_dialect"]) ?? "postgresql",
    db_username: (cfg.username as string) ?? "",
    db_password: "",
    rest_base_url: (cfg.base_url as string) ?? "",
    rest_auth_type: (cfg.auth_type as FormState["rest_auth_type"]) ?? "none",
    rest_token: "",
    rest_username: (cfg.username as string) ?? "",
    rest_password: "",
    rest_api_key: "",
    ssh_host: (cfg.host as string) ?? "",
    ssh_port: String((cfg.port as number) ?? 22),
    ssh_username: (cfg.username as string) ?? "",
    ssh_auth_type: (cfg.auth_type as FormState["ssh_auth_type"]) ?? "password",
    ssh_password: "",
    ssh_private_key: "",
    mira_base_url: (cfg.base_url as string) ?? "",
    mira_token: "",
  };
}

function formToPayload(f: FormState): ConnectorCreateData {
  let config: Record<string, unknown> = {};
  switch (f.connector_type) {
    case "db":
      config = {
        host: f.db_host, port: parseInt(f.db_port), database: f.db_database,
        dialect: f.db_dialect, username: f.db_username,
        ...(f.db_password ? { password: f.db_password } : {}),
      };
      break;
    case "rest_api":
      config = {
        base_url: f.rest_base_url, auth_type: f.rest_auth_type,
        ...(f.rest_auth_type === "bearer" && f.rest_token ? { token: f.rest_token } : {}),
        ...(f.rest_auth_type === "basic" ? {
          username: f.rest_username,
          ...(f.rest_password ? { password: f.rest_password } : {}),
        } : {}),
        ...(f.rest_auth_type === "api_key" && f.rest_api_key ? { api_key: f.rest_api_key } : {}),
      };
      break;
    case "ssh":
      config = {
        host: f.ssh_host, port: parseInt(f.ssh_port), username: f.ssh_username,
        auth_type: f.ssh_auth_type,
        ...(f.ssh_auth_type === "password" && f.ssh_password ? { password: f.ssh_password } : {}),
        ...(f.ssh_auth_type === "private_key" && f.ssh_private_key ? { private_key: f.ssh_private_key } : {}),
      };
      break;
    case "webhook":
      config = {};
      break;
    case "mira_api":
      config = {
        base_url: f.mira_base_url,
        ...(f.mira_token ? { token: f.mira_token } : {}),
      };
      break;
  }
  return { name: f.name, connector_type: f.connector_type, config };
}

// ─── Field components ────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, required,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function SecretInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function SelectInput({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Type-specific config fields ─────────────────────────────────────────────────

function DbFields({ form, set }: { form: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Host" required><TextInput value={form.db_host} onChange={(v) => set("db_host", v)} placeholder="localhost" /></Field>
        <Field label="Port"><TextInput value={form.db_port} onChange={(v) => set("db_port", v)} placeholder="5432" /></Field>
      </div>
      <Field label="Database" required><TextInput value={form.db_database} onChange={(v) => set("db_database", v)} placeholder="mydb" /></Field>
      <Field label="Dialect">
        <SelectInput value={form.db_dialect} onChange={(v) => set("db_dialect", v)} options={[
          { value: "postgresql", label: "PostgreSQL" },
          { value: "mysql", label: "MySQL" },
          { value: "mssql", label: "SQL Server" },
          { value: "sqlite", label: "SQLite" },
        ]} />
      </Field>
      <Field label="Username"><TextInput value={form.db_username} onChange={(v) => set("db_username", v)} placeholder="postgres" /></Field>
      <Field label="Password"><SecretInput value={form.db_password} onChange={(v) => set("db_password", v)} /></Field>
    </div>
  );
}

function RestApiFields({ form, set }: { form: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Base URL" required><TextInput value={form.rest_base_url} onChange={(v) => set("rest_base_url", v)} placeholder="https://api.example.com" /></Field>
      <Field label="Auth Type">
        <SelectInput value={form.rest_auth_type} onChange={(v) => set("rest_auth_type", v)} options={[
          { value: "none", label: "None" },
          { value: "bearer", label: "Bearer Token" },
          { value: "basic", label: "Basic Auth" },
          { value: "api_key", label: "API Key" },
        ]} />
      </Field>
      {form.rest_auth_type === "bearer" && (
        <Field label="Token"><SecretInput value={form.rest_token} onChange={(v) => set("rest_token", v)} /></Field>
      )}
      {form.rest_auth_type === "basic" && (
        <>
          <Field label="Username"><TextInput value={form.rest_username} onChange={(v) => set("rest_username", v)} /></Field>
          <Field label="Password"><SecretInput value={form.rest_password} onChange={(v) => set("rest_password", v)} /></Field>
        </>
      )}
      {form.rest_auth_type === "api_key" && (
        <Field label="API Key"><SecretInput value={form.rest_api_key} onChange={(v) => set("rest_api_key", v)} /></Field>
      )}
    </div>
  );
}

function SshFields({ form, set }: { form: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Host" required><TextInput value={form.ssh_host} onChange={(v) => set("ssh_host", v)} placeholder="192.168.1.1" /></Field>
        <Field label="Port"><TextInput value={form.ssh_port} onChange={(v) => set("ssh_port", v)} placeholder="22" /></Field>
      </div>
      <Field label="Username"><TextInput value={form.ssh_username} onChange={(v) => set("ssh_username", v)} placeholder="root" /></Field>
      <Field label="Auth Type">
        <SelectInput value={form.ssh_auth_type} onChange={(v) => set("ssh_auth_type", v)} options={[
          { value: "password", label: "Password" },
          { value: "private_key", label: "Private Key" },
        ]} />
      </Field>
      {form.ssh_auth_type === "password" && (
        <Field label="Password"><SecretInput value={form.ssh_password} onChange={(v) => set("ssh_password", v)} /></Field>
      )}
      {form.ssh_auth_type === "private_key" && (
        <Field label="Private Key">
          <textarea
            value={form.ssh_private_key}
            onChange={(e) => set("ssh_private_key", e.target.value)}
            rows={5}
            placeholder="-----BEGIN RSA PRIVATE KEY-----"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </Field>
      )}
    </div>
  );
}

function WebhookFields({ connector }: { connector: ConductorConnector | null }) {
  const token = connector?.webhook_token;
  const webhookUrl = token
    ? `${window.location.origin}/api/v1/conductor/webhook/${token}/`
    : "Will be generated on save";
  return (
    <div className="space-y-3">
      <Field label="Webhook Token">
        <input
          type="text"
          readOnly
          value={token ?? "Saved after creation"}
          className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 font-mono"
        />
      </Field>
      <Field label="Webhook URL">
        <input
          type="text"
          readOnly
          value={webhookUrl}
          className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 font-mono"
        />
      </Field>
      {!connector && (
        <p className="text-xs text-gray-400">The webhook URL and token will be generated automatically.</p>
      )}
    </div>
  );
}

function MiraApiFields({ form, set }: { form: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Base URL" required><TextInput value={form.mira_base_url} onChange={(v) => set("mira_base_url", v)} placeholder="https://mira.example.com" /></Field>
      <Field label="API Token"><SecretInput value={form.mira_token} onChange={(v) => set("mira_token", v)} /></Field>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function ConductorConnectors() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["conductor-connectors"],
    queryFn: () => conductorApi.getConnectors().then((r) => r.data),
  });
  const connectors: ConductorConnector[] = data?.results ?? [];
  const selectedConnector = connectors.find((c) => c.id === selectedId) ?? null;

  const setField = (k: keyof FormState, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setTestResult(null);
  };

  const openNew = () => {
    setSelectedId("new");
    setForm(emptyForm());
    setTestResult(null);
  };

  const openConnector = (c: ConductorConnector) => {
    setSelectedId(c.id);
    setForm(connectorToForm(c));
    setTestResult(null);
  };

  const createMutation = useMutation({
    mutationFn: (data: ConnectorCreateData) => conductorApi.createConnector(data).then((r) => r.data),
    onSuccess: (created: ConductorConnector) => {
      qc.invalidateQueries({ queryKey: ["conductor-connectors"] });
      setSelectedId(created.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ConnectorCreateData> }) =>
      conductorApi.updateConnector(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-connectors"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => conductorApi.deleteConnector(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conductor-connectors"] });
      setSelectedId(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => conductorApi.testConnector(id).then((r) => r.data),
    onSuccess: (result: { success: boolean; message: string }) => setTestResult(result),
    onError: () => setTestResult({ success: false, message: "Connection test failed." }),
  });

  const handleSave = () => {
    const payload = formToPayload(form);
    if (selectedId === "new") {
      createMutation.mutate(payload);
    } else if (selectedId) {
      updateMutation.mutate({ id: selectedId, data: payload });
    }
  };

  const handleDelete = () => {
    if (!selectedId || selectedId === "new") return;
    if (confirm(`Delete connector "${selectedConnector?.name}"?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  const handleTest = () => {
    if (!selectedId || selectedId === "new") return;
    testMutation.mutate(selectedId);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connectors</h1>
          <p className="text-gray-500 mt-0.5">Configure data source integrations for AI evidence collection</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Connector
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connector list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">All Connectors</h2>
          </div>
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : connectors.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No connectors yet. Create one to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {connectors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConnector(c)}
                  className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedId === c.id ? "bg-blue-50 border-l-2 border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${connectorTypeBadgeColor(c.connector_type)}`}>
                      {connectorTypeIcon(c.connector_type)}
                      {connectorTypeLabel(c.connector_type)}
                    </span>
                    <span className="ml-auto">
                      {c.last_test_success === true ? (
                        <CheckCircle size={13} className="text-green-500" />
                      ) : c.last_test_success === false ? (
                        <XCircle size={13} className="text-red-500" />
                      ) : null}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  {c.last_tested_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Tested {new Date(c.last_tested_at).toLocaleDateString()}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail / Create form */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 h-full flex flex-col items-center justify-center">
              <Database className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm">Select a connector or create a new one.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">
                {selectedId === "new" ? "New Connector" : `Edit: ${selectedConnector?.name}`}
              </h2>

              <div className="space-y-4">
                {/* Common fields */}
                <Field label="Connector Name" required>
                  <TextInput value={form.name} onChange={(v) => setField("name", v)} placeholder="My Database" />
                </Field>

                {selectedId === "new" && (
                  <Field label="Connector Type">
                    <SelectInput
                      value={form.connector_type}
                      onChange={(v) => setField("connector_type", v)}
                      options={[
                        { value: "db", label: "Database" },
                        { value: "rest_api", label: "REST API" },
                        { value: "ssh", label: "SSH" },
                        { value: "webhook", label: "Webhook" },
                        { value: "mira_api", label: "MIRA API" },
                      ]}
                    />
                  </Field>
                )}

                <hr className="border-gray-100" />

                {/* Type-specific fields */}
                {form.connector_type === "db" && <DbFields form={form} set={setField} />}
                {form.connector_type === "rest_api" && <RestApiFields form={form} set={setField} />}
                {form.connector_type === "ssh" && <SshFields form={form} set={setField} />}
                {form.connector_type === "webhook" && <WebhookFields connector={selectedConnector} />}
                {form.connector_type === "mira_api" && <MiraApiFields form={form} set={setField} />}

                {/* Test result */}
                {testResult && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      testResult.success
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {testResult.success ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <XCircle size={15} className="mt-0.5 shrink-0" />}
                    {testResult.message}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !form.name}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving && <Loader2 size={14} className="animate-spin" />}
                    {selectedId === "new" ? "Create" : "Save"}
                  </button>

                  {selectedId !== "new" && (
                    <>
                      <button
                        onClick={handleTest}
                        disabled={testMutation.isPending}
                        className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        {testMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Test Connection
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="ml-auto flex items-center gap-2 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </>
                  )}
                </div>

                {(createMutation.isError || updateMutation.isError) && (
                  <p className="text-sm text-red-600">Failed to save. Please check your inputs.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
