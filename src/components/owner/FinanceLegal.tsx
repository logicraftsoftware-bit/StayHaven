"use client";

import { FileText, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { ReactNode } from "react";

type Finance = Record<string, unknown>;
type Document = Record<string, unknown>;

const ownershipTypes = [
  "My Own property",
  "My Spouse owns the property",
  "My Parents / Grand Parents own the property",
  "My Sibling / Cousin owns the property",
  "My friend owns the property",
  "I have taken property for Revenue Management",
  "Lease Property",
];

export function FinanceLegal({
  values,
  documents,
  propertyAddress,
  setValue,
  uploadDocument,
  removeDocument,
}: {
  values: Finance;
  documents: Document[];
  propertyAddress: string;
  setValue: (field: string, value: unknown) => void;
  uploadDocument: (file: File, type: string) => Promise<void>;
  removeDocument: (index: number) => void;
}) {
  const hasRegistration = Boolean(values.hasRegistration);
  const hasGstin = Boolean(values.hasGstin);
  const hasTan = Boolean(values.hasTan);

  return (
    <div className="finance-legal">
      <FinanceSection
        title="Ownership Details"
        subtitle="Upload ownership documents"
      >
        <div className="finance-grid">
          <label>
            Types of Property Ownership
            <select
              value={String(values.ownershipType || "")}
              onChange={(event) =>
                setValue("ownershipType", event.target.value)
              }
            >
              <option value="">Select ownership type</option>
              {ownershipTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <YesNo
            label="Do you have the registration document?"
            value={hasRegistration}
            onChange={(value) => setValue("hasRegistration", value)}
          />
        </div>

        {hasRegistration ? (
          <>
            <div className="finance-address">
              <b>Property address</b>
              <span>
                {propertyAddress || "Add the property address in Step 3."}
              </span>
            </div>
            <DocumentUpload
              title="Registration document"
              type="ownership-proof"
              onUpload={uploadDocument}
            />
          </>
        ) : (
          <div className="finance-lessor">
            <h4>
              Enter the name and address of the lessor (Owner of the property)
            </h4>
            <div className="finance-grid">
              <TextInput
                label="Owner's First Name"
                value={values.ownerFirstName}
                onChange={(value) => setValue("ownerFirstName", value)}
              />
              <TextInput
                label="Owner's Last Name"
                value={values.ownerLastName}
                onChange={(value) => setValue("ownerLastName", value)}
              />
            </div>
            <label>
              Owner&apos;s Address
              <textarea
                maxLength={250}
                value={String(values.ownerAddress || "")}
                onChange={(event) =>
                  setValue("ownerAddress", event.target.value)
                }
              />
            </label>
            <Check
              label="I accept the Terms and Conditions for registration of this property."
              checked={Boolean(values.ownershipTermsAccepted)}
              onChange={(value) => setValue("ownershipTermsAccepted", value)}
            />
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        title="ID Proof"
        subtitle="Upload your identity proof for verification"
      >
        <label className="finance-id-type">
          ID Type
          <select
            value={String(values.idType || "")}
            onChange={(event) => setValue("idType", event.target.value)}
          >
            <option value="">Select</option>
            <option>Aadhaar Card (Recommended)</option>
            <option>Driving Licence</option>
            <option>Passport</option>
            <option>Voter ID</option>
            <option>No Document</option>
          </select>
        </label>
        {values.idType !== "No Document" && (
          <DocumentUpload
            title="ID proof"
            type="identity-proof"
            onUpload={uploadDocument}
          />
        )}
      </FinanceSection>

      <FinanceSection
        title="Banking Details"
        subtitle="Enter your bank and GST/PAN details"
      >
        <div className="finance-grid">
          <TextInput
            label="Account holder name"
            value={values.accountHolder}
            onChange={(value) => setValue("accountHolder", value)}
          />
          <TextInput
            label="Bank name"
            value={values.bankName}
            onChange={(value) => setValue("bankName", value)}
          />
          <TextInput
            label="Account Number"
            value={values.accountNumber}
            onChange={(value) => setValue("accountNumber", value)}
          />
          <TextInput
            label="Re-enter Account Number"
            value={values.confirmAccountNumber}
            onChange={(value) => setValue("confirmAccountNumber", value)}
          />
          <TextInput
            label="IFSC Code"
            value={values.ifsc}
            onChange={(value) => setValue("ifsc", value.toUpperCase())}
          />
        </div>
        <div className="finance-tax-row">
          <YesNo
            label="Do you have a GSTIN?"
            value={hasGstin}
            onChange={(value) => setValue("hasGstin", value)}
          />
        </div>
        <div className="finance-grid">
          {hasGstin && (
            <TextInput
              label="GSTIN"
              value={values.gstin}
              onChange={(value) => setValue("gstin", value.toUpperCase())}
            />
          )}
          <TextInput
            label="PAN Number"
            value={values.pan}
            onChange={(value) => setValue("pan", value.toUpperCase())}
          />
        </div>
        <Check
          label="I accept the GST declaration and consent to verification."
          checked={Boolean(values.gstConsent)}
          onChange={(value) => setValue("gstConsent", value)}
        />
        <div className="finance-tax-row">
          <YesNo
            label="Do you have a TAN?"
            value={hasTan}
            onChange={(value) => setValue("hasTan", value)}
          />
        </div>
        {hasTan && (
          <div className="finance-grid">
            <TextInput
              label="TAN"
              value={values.tan}
              onChange={(value) => setValue("tan", value.toUpperCase())}
            />
          </div>
        )}
      </FinanceSection>

      {documents.length > 0 && (
        <section className="finance-documents">
          <h3>Uploaded Documents</h3>
          {documents.map((document, index) => (
            <div key={String(document.id || index)}>
              <FileText />
              <a href={String(document.url)} target="_blank" rel="noreferrer">
                {String(document.type || "Document").replaceAll("-", " ")}
              </a>
              <span>{String(document.verificationStatus || "pending")}</span>
              <button
                type="button"
                aria-label="Remove document"
                onClick={() => removeDocument(index)}
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </section>
      )}

      <label className="finance-consent">
        <input
          type="checkbox"
          checked={Boolean(values.verificationConsent)}
          onChange={(event) =>
            setValue("verificationConsent", event.target.checked)
          }
        />
        <ShieldCheck />
        <span>
          Final verification may be completed by a trusted third party. I
          consent to initiate this process.
        </span>
      </label>
      <div className="secure-note">
        Banking and identity information is private and never included in public
        property APIs.
      </div>
    </div>
  );
}

function FinanceSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="finance-section">
      <header>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </header>
      <div className="finance-section-body">{children}</div>
    </section>
  );
}
function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        value={String(value || "")}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="finance-yes-no">
      <b>{label}</b>
      <div>
        <button
          type="button"
          className={!value ? "active" : ""}
          onClick={() => onChange(false)}
        >
          <i /> No
        </button>
        <button
          type="button"
          className={value ? "active" : ""}
          onClick={() => onChange(true)}
        >
          <i /> Yes
        </button>
      </div>
    </div>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="finance-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
function DocumentUpload({
  title,
  type,
  onUpload,
}: {
  title: string;
  type: string;
  onUpload: (file: File, type: string) => Promise<void>;
}) {
  return (
    <label className="finance-upload">
      <Upload />
      <strong>Drag & drop the {title}</strong>
      <span>or click here to upload</span>
      <small>PDF, PNG, JPG or JPEG up to 10 MB</small>
      <input
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUpload(file, type);
          event.target.value = "";
        }}
      />
    </label>
  );
}
