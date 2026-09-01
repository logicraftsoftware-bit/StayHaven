"use client";
import { ArrowLeft, Plus, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { OWNER_TOKEN_KEY } from "./OwnerAuth";
type Api<T> = { success: boolean; data: T };
type Property = { _id: string; name: string };
type Member = {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  permissions: string[];
  assignedPropertyIds: string[];
  temporaryPassword?: string;
};
const permissions = [
  "VIEW_PROPERTIES",
  "EDIT_PROPERTIES",
  "VIEW_BOOKINGS",
  "MANAGE_BOOKINGS",
  "VIEW_PAYMENTS",
  "VIEW_RATES",
  "MANAGE_RATES",
  "VIEW_ANALYTICS",
  "VIEW_REVIEWS",
  "MANAGE_REVIEWS",
  "CONTACT_SUPPORT",
];
export function TeamManager() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [notice, setNotice] = useState("");
  const load = async (t: string) => {
    const [m, p] = await Promise.all([
      apiRequest<Api<Member[]>>("/api/v1/owner/team", t),
      apiRequest<Api<Property[]>>("/api/v1/owner/properties", t),
    ]);
    setMembers(m.data);
    setProperties(p.data);
  };
  useEffect(() => {
    queueMicrotask(() => {
      const t = localStorage.getItem(OWNER_TOKEN_KEY) || "";
      if (!t) return router.replace("/list-your-property");
      setToken(t);
      void load(t);
    });
  }, [router]);
  const save = async () => {
    if (!editing) return;
    try {
      await apiRequest(
        `/api/v1/owner/team${editing._id ? `/${editing._id}` : ""}`,
        token,
        {
          method: editing._id ? "PATCH" : "POST",
          body: JSON.stringify(editing),
        },
      );
      setEditing(null);
      await load(token);
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  return (
    <main className="owner-main" style={{ margin: "auto" }}>
      <button className="owner-btn" onClick={() => router.push("/owner")}>
        <ArrowLeft /> My Properties
      </button>
      <header className="owner-page-head" style={{ marginTop: 24 }}>
        <div>
          <span>OWNER TEAM</span>
          <h1>Manage Your Team</h1>
          <p>
            Assign granular permissions and only the properties each member may
            access.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() =>
            setEditing({
              name: "",
              email: "",
              phone: "",
              status: "active",
              permissions: [],
            assignedPropertyIds: [],
            temporaryPassword: "",
            })
          }
        >
          <Plus /> Add New Member
        </button>
      </header>
      {notice && <p className="owner-review-note">{notice}</p>}
      <div className="team-list">
        {members.map((member) => (
          <article key={member._id}>
            <Users />
            <div>
              <h2>{member.name}</h2>
              <p>{member.email}</p>
              <small>
                {member.permissions.length} permissions ·{" "}
                {member.assignedPropertyIds.length} properties
              </small>
            </div>
            <button onClick={() => setEditing(member)}>View / Edit</button>
          </article>
        ))}
      </div>
      {editing && (
        <section className="wizard-card" style={{ marginTop: 24 }}>
          <h2>{editing._id ? "Edit team member" : "Add a new member"}</h2>
          <div className="wizard-grid" style={{ marginTop: 20 }}>
            <label>
              Name
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={editing.email}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value })
                }
              />
            </label>
            <label>
              Phone
              <input
                value={editing.phone || ""}
                onChange={(e) =>
                  setEditing({ ...editing, phone: e.target.value })
                }
              />
            </label>
          <label>
            Status
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
          </label>
          <label>
            {editing._id ? "Reset password (optional)" : "Temporary password"}
            <input
              type="password"
              minLength={8}
              required={!editing._id}
              value={editing.temporaryPassword || ""}
              onChange={(e) =>
                setEditing({ ...editing, temporaryPassword: e.target.value })
              }
            />
          </label>
          </div>
          <h3 style={{ marginTop: 25 }}>Permissions</h3>
          <div className="choice-grid" style={{ marginTop: 12 }}>
            {permissions.map((p) => (
              <label key={p}>
                <input
                  type="checkbox"
                  checked={editing.permissions.includes(p)}
                  onChange={() =>
                    setEditing({
                      ...editing,
                      permissions: editing.permissions.includes(p)
                        ? editing.permissions.filter((x) => x !== p)
                        : [...editing.permissions, p],
                    })
                  }
                />
                {p.replaceAll("_", " ")}
              </label>
            ))}
          </div>
          <h3 style={{ marginTop: 25 }}>Assigned properties</h3>
          <div className="choice-grid" style={{ marginTop: 12 }}>
            {properties.map((p) => (
              <label key={p._id}>
                <input
                  type="checkbox"
                  checked={editing.assignedPropertyIds
                    .map(String)
                    .includes(p._id)}
                  onChange={() =>
                    setEditing({
                      ...editing,
                      assignedPropertyIds: editing.assignedPropertyIds
                        .map(String)
                        .includes(p._id)
                        ? editing.assignedPropertyIds.filter(
                            (x) => String(x) !== p._id,
                          )
                        : [...editing.assignedPropertyIds, p._id],
                    })
                  }
                />
                {p.name}
              </label>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => void save()}>
              <ShieldCheck /> Save Member
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
