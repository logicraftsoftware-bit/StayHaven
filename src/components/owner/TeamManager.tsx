"use client";

import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Headphones,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
const groups = [
  {
    title: "Bookings",
    icon: CalendarDays,
    items: ["VIEW_BOOKINGS", "MANAGE_BOOKINGS"],
  },
  {
    title: "Rates & inventory",
    icon: WalletCards,
    items: ["VIEW_RATES", "MANAGE_RATES", "VIEW_PAYMENTS"],
  },
  {
    title: "Property content",
    icon: Building2,
    items: ["VIEW_PROPERTIES", "EDIT_PROPERTIES"],
  },
  {
    title: "Insights & reviews",
    icon: BarChart3,
    items: ["VIEW_ANALYTICS", "VIEW_REVIEWS", "MANAGE_REVIEWS"],
  },
];
const blankMember = (): Member => ({
  name: "",
  email: "",
  phone: "",
  status: "active",
  permissions: [],
  assignedPropertyIds: [],
  temporaryPassword: "",
});

export function TeamManager() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [step, setStep] = useState(1);
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (authToken: string) => {
    const [memberResponse, propertyResponse] = await Promise.all([
      apiRequest<Api<Member[]>>("/api/v1/owner/team", authToken),
      apiRequest<Api<Property[]>>("/api/v1/owner/properties", authToken),
    ]);
    setMembers(memberResponse.data);
    setProperties(propertyResponse.data);
  };

  useEffect(() => {
    queueMicrotask(() => {
      const authToken = localStorage.getItem(OWNER_TOKEN_KEY) || "";
      if (!authToken) return router.replace("/list-your-property");
      setToken(authToken);
      void load(authToken);
    });
  }, [router]);

  const visibleMembers = useMemo(
    () =>
      filter === "all"
        ? members
        : members.filter((member) =>
            member.assignedPropertyIds.map(String).includes(filter),
          ),
    [filter, members],
  );

  const openEditor = (member: Member) => {
    setEditing({
      ...member,
      permissions: [...member.permissions],
      assignedPropertyIds: [...member.assignedPropertyIds],
      temporaryPassword: "",
    });
    setStep(1);
    setNotice("");
  };

  const canContinue = () => {
    if (!editing) return false;
    if (step === 1 && (!editing.name.trim() || !editing.email.trim())) {
      setNotice("Please enter the member's name and email address.");
      return false;
    }
    if (
      step === 1 &&
      !editing._id &&
      (editing.temporaryPassword || "").length < 8
    ) {
      setNotice("Temporary password must contain at least 8 characters.");
      return false;
    }
    setNotice("");
    return true;
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setNotice("");
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
      setStep(1);
      await load(token);
      setNotice("Team member saved successfully.");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permission: string) =>
    editing &&
    setEditing({
      ...editing,
      permissions: editing.permissions.includes(permission)
        ? editing.permissions.filter((item) => item !== permission)
        : [...editing.permissions, permission],
    });
  const toggleProperty = (propertyId: string) => {
    if (!editing) return;
    const selected = editing.assignedPropertyIds
      .map(String)
      .includes(propertyId);
    setEditing({
      ...editing,
      assignedPropertyIds: selected
        ? editing.assignedPropertyIds.filter(
            (item) => String(item) !== propertyId,
          )
        : [...editing.assignedPropertyIds, propertyId],
    });
  };

  if (editing)
    return (
      <main className="owner-main owner-team-page">
        <button
          className="team-back-link"
          onClick={() => {
            setEditing(null);
            setNotice("");
          }}
        >
          <ArrowLeft /> Back to My Team
        </button>
        <header className="team-editor-heading">
          <span>OWNER TEAM</span>
          <h1>{editing._id ? "Edit Team Member" : "Add a New Member"}</h1>
          <p>Set up a secure profile, permissions and property access.</p>
        </header>
        {notice && <p className="owner-review-note team-notice">{notice}</p>}
        <section className="team-editor-card">
          <nav className="team-wizard-tabs" aria-label="Member setup steps">
            {["Profile", "Permissions", "Properties"].map((label, index) => (
              <button
                type="button"
                className={step === index + 1 ? "active" : ""}
                onClick={() => {
                  if (index + 1 <= step || canContinue()) setStep(index + 1);
                }}
                key={label}
              >
                <span>{index + 1}</span>
                <small>Step {index + 1}</small>
                <strong>{label}</strong>
              </button>
            ))}
          </nav>
          <div className="team-editor-body">
            {step === 1 && (
              <div className="team-form-section">
                <div className="team-section-heading">
                  <CircleUserRound />
                  <div>
                    <h2>Member profile</h2>
                    <p>Enter the account and contact information.</p>
                  </div>
                </div>
                <div className="wizard-grid">
                  <label>
                    Full name
                    <input
                      autoFocus
                      value={editing.name}
                      onChange={(event) =>
                        setEditing({ ...editing, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      type="email"
                      value={editing.email}
                      onChange={(event) =>
                        setEditing({ ...editing, email: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      value={editing.phone || ""}
                      onChange={(event) =>
                        setEditing({ ...editing, phone: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Account status
                    <select
                      value={editing.status}
                      onChange={(event) =>
                        setEditing({ ...editing, status: event.target.value })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                  <label>
                    {editing._id
                      ? "Reset password (optional)"
                      : "Temporary password"}
                    <input
                      type="password"
                      minLength={8}
                      value={editing.temporaryPassword || ""}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          temporaryPassword: event.target.value,
                        })
                      }
                    />
                    <small>Use at least 8 characters.</small>
                  </label>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="team-form-section">
                <div className="team-section-heading">
                  <KeyRound />
                  <div>
                    <h2>Choose permissions</h2>
                    <p>Select exactly what this member can view or manage.</p>
                  </div>
                </div>
                <div className="team-permission-picker">
                  {permissions.map((permission) => (
                    <label key={permission}>
                      <input
                        type="checkbox"
                        checked={editing.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                      />
                      <span>
                        <strong>
                          {permission
                            .replaceAll("_", " ")
                            .toLowerCase()
                            .replace(/^./, (letter) => letter.toUpperCase())}
                        </strong>
                        <small>
                          Grant access to this area of the partner portal.
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="team-form-section">
                <div className="team-section-heading">
                  <Building2 />
                  <div>
                    <h2>Assign properties</h2>
                    <p>
                      The member can only access the properties selected here.
                    </p>
                  </div>
                </div>
                <div className="team-property-picker">
                  {properties.length ? (
                    properties.map((property) => (
                      <label key={property._id}>
                        <input
                          type="checkbox"
                          checked={editing.assignedPropertyIds
                            .map(String)
                            .includes(property._id)}
                          onChange={() => toggleProperty(property._id)}
                        />
                        <Building2 />
                        <span>
                          <strong>{property.name || "Unnamed property"}</strong>
                          <small>Property access</small>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="team-empty-copy">
                      Add a property before assigning it to a team member.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <footer className="team-editor-actions">
            <button
              type="button"
              className="team-secondary-button"
              onClick={() =>
                step === 1
                  ? setEditing(null)
                  : setStep((current) => current - 1)
              }
            >
              {step === 1 ? (
                "Cancel"
              ) : (
                <>
                  <ChevronLeft /> Previous
                </>
              )}
            </button>
            {step < 3 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (canContinue()) setStep((current) => current + 1);
                }}
              >
                Continue <ChevronRight />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => void save()}
              >
                <ShieldCheck /> {saving ? "Saving..." : "Save Member"}
              </button>
            )}
          </footer>
        </section>
      </main>
    );

  return (
    <main className="owner-main owner-team-page">
      <button className="team-back-link" onClick={() => router.push("/owner")}>
        <ArrowLeft /> My Properties
      </button>
      <header className="owner-page-head team-page-heading">
        <div>
          <span>OWNER TEAM</span>
          <h1>Manage Your Team</h1>
          <p>
            Give every teammate secure access to the properties and tools they
            need.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => openEditor(blankMember())}
        >
          <Plus /> Add New Member
        </button>
      </header>
      {notice && <p className="owner-review-note team-notice">{notice}</p>}
      <section className="team-overview-card">
        <div className="team-overview-toolbar">
          <div>
            <label htmlFor="team-property-filter">Showing team for</label>
            <select
              id="team-property-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All properties</option>
              {properties.map((property) => (
                <option value={property._id} key={property._id}>
                  {property.name || "Unnamed property"}
                </option>
              ))}
            </select>
          </div>
          <div className="team-count-pill">
            <Users />
            <strong>{visibleMembers.length}</strong>
            <span>{visibleMembers.length === 1 ? "member" : "members"}</span>
          </div>
        </div>
        <div className="team-access-head" aria-hidden="true">
          <span>Team member</span>
          {groups.map((group) => (
            <span key={group.title}>{group.title}</span>
          ))}
          <span>Action</span>
        </div>
        <div className="team-access-list">
          {visibleMembers.length ? (
            visibleMembers.map((member) => (
              <article key={member._id || member.email}>
                <div className="team-member-cell">
                  <div className="team-avatar">
                    {(member.name || member.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h2>{member.name || "Unnamed member"}</h2>
                    <p>{member.email}</p>
                    <span className={`team-status ${member.status}`}>
                      {member.status}
                    </span>
                  </div>
                </div>
                {groups.map((group) => {
                  const enabled = group.items.filter((permission) =>
                    member.permissions.includes(permission),
                  ).length;
                  const Icon = group.icon;
                  return (
                    <div className="team-access-cell" key={group.title}>
                      <Icon />
                      <strong>
                        {enabled ? "Access enabled" : "No access"}
                      </strong>
                      <small>
                        {enabled}/{group.items.length} permissions
                      </small>
                    </div>
                  );
                })}
                <button
                  className="team-edit-button"
                  onClick={() => openEditor(member)}
                >
                  <Pencil /> Edit
                </button>
              </article>
            ))
          ) : (
            <div className="team-empty-state">
              <Users />
              <h2>No team members yet</h2>
              <p>Add a member and control what they can access.</p>
              <button
                className="btn-primary"
                onClick={() => openEditor(blankMember())}
              >
                <Plus /> Add New Member
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="team-onboarding-card">
        <div className="team-onboarding-copy">
          <span>WORK BETTER TOGETHER</span>
          <h2>Work as a Team</h2>
          <p>Secure accounts, clear responsibilities and controlled access.</p>
          <button
            className="btn-primary"
            onClick={() => openEditor(blankMember())}
          >
            <Plus /> Add New Member
          </button>
        </div>
        <div className="team-benefits">
          <article>
            <ShieldCheck />
            <div>
              <h3>Secure all accounts</h3>
              <p>Each teammate receives a separate login.</p>
            </div>
          </article>
          <article>
            <SlidersHorizontal />
            <div>
              <h3>Assign permissions</h3>
              <p>Choose which tools each member can manage.</p>
            </div>
          </article>
          <article>
            <Building2 />
            <div>
              <h3>Assign properties</h3>
              <p>Limit access to the right properties.</p>
            </div>
          </article>
          <article>
            <Headphones />
            <div>
              <h3>Stay supported</h3>
              <p>Give trusted members support access.</p>
            </div>
          </article>
        </div>
        <div className="team-visual" aria-hidden="true">
          <div>
            <Users />
          </div>
          <span>
            <ShieldCheck />
          </span>
        </div>
      </section>
    </main>
  );
}
