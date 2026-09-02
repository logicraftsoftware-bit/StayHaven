"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Policies = Record<string, unknown>;

const times = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 ? "30" : "00";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

export function MealsPolicies({
  mealPlans,
  setMealPlans,
  policies,
  setPolicy,
}: {
  mealPlans: Array<Record<string, unknown>>;
  setMealPlans: (plans: Array<Record<string, unknown>>) => void;
  policies: Policies;
  setPolicy: (field: string, value: unknown) => void;
}) {
  return (
    <div className="meals-policies">
      <PolicySection
        title="Meals, Pricing & Availability"
        count="Meal preferences"
      >
        <div className="policy-grid">
          <label>
            Meal plan
            <select
              value={String(mealPlans[0]?.name || "Room Only")}
              onChange={(event) =>
                setMealPlans([
                  {
                    name: event.target.value,
                    included: event.target.value !== "Room Only",
                  },
                ])
              }
            >
              <option>Room Only</option>
              <option>Breakfast Included</option>
              <option>Breakfast + Dinner</option>
              <option>All Meals</option>
            </select>
          </label>
          <YesNo
            label="Is food and kitchen available?"
            value={Boolean(policies.foodKitchenAvailable)}
            onChange={(value) => setPolicy("foodKitchenAvailable", value)}
          />
        </div>
      </PolicySection>

      <PolicySection title="Check-in & Check-out Time" count="Required">
        <div className="policy-grid">
          <TimeSelect
            label="Check-in time"
            value={String(policies.checkIn || "12:00")}
            onChange={(value) => setPolicy("checkIn", value)}
          />
          <TimeSelect
            label="Check-out time"
            value={String(policies.checkOut || "12:00")}
            onChange={(value) => setPolicy("checkOut", value)}
          />
          <YesNo
            label="Does the property have a check-in end time?"
            value={Boolean(policies.hasCheckInEnd)}
            onChange={(value) => setPolicy("hasCheckInEnd", value)}
          />
          {Boolean(policies.hasCheckInEnd) && (
            <TimeSelect
              label="Check-in end time"
              value={String(policies.checkInEnd || "22:00")}
              onChange={(value) => setPolicy("checkInEnd", value)}
            />
          )}
        </div>
      </PolicySection>

      <PolicySection title="Cancellation Policy" count="Choose one">
        <div className="policy-radio-list">
          {[
            "Free cancellation till check-in",
            "Free cancellation till 24 hours before check-in",
            "Free cancellation till 72 hours before check-in",
            "Free cancellation till 7 days before check-in",
            "Non-Refundable",
          ].map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="cancellation-policy"
                checked={policies.cancellation === option}
                onChange={() => setPolicy("cancellation", option)}
              />
              <span>{option}</span>
              {option.includes("24 hours") && <b>RECOMMENDED</b>}
            </label>
          ))}
        </div>
      </PolicySection>

      <PolicySection title="Guest Profile" count="3 rules">
        <YesNo
          label="Do you allow unmarried couples?"
          value={Boolean(policies.unmarriedCouples)}
          onChange={(value) => setPolicy("unmarriedCouples", value)}
        />
        <YesNo
          label="Do you allow guests below 18 years of age?"
          value={Boolean(policies.guestsBelow18)}
          onChange={(value) => setPolicy("guestsBelow18", value)}
        />
        <YesNo
          label="Are groups with only male guests allowed?"
          value={Boolean(policies.maleGroups)}
          onChange={(value) => setPolicy("maleGroups", value)}
        />
      </PolicySection>

      <PolicySection title="Acceptable Identity Proofs" count="2 rules">
        <label>
          Accepted identity proofs
          <select
            value={String(policies.identityProof || "")}
            onChange={(event) => setPolicy("identityProof", event.target.value)}
          >
            <option value="">Select</option>
            <option>Aadhaar Card</option>
            <option>Passport</option>
            <option>Driving Licence</option>
            <option>Voter ID</option>
            <option>PAN Card</option>
            <option>Government ID</option>
          </select>
        </label>
        <YesNo
          label="Are IDs from the same city accepted?"
          value={Boolean(policies.localIdsAllowed)}
          onChange={(value) => setPolicy("localIdsAllowed", value)}
        />
      </PolicySection>

      <PolicySection title="Property Restrictions" count="6 rules">
        <YesNo
          label="Is smoking allowed anywhere within the premises?"
          value={Boolean(policies.smokingAllowed)}
          onChange={(value) => setPolicy("smokingAllowed", value)}
        />
        <YesNo
          label="Are private parties or events allowed?"
          value={Boolean(policies.partiesAllowed)}
          onChange={(value) => setPolicy("partiesAllowed", value)}
        />
        <YesNo
          label="Is the property accessible for guests who use a wheelchair?"
          value={Boolean(policies.wheelchairAccessible)}
          onChange={(value) => setPolicy("wheelchairAccessible", value)}
        />
        <YesNo
          label="Are there restrictions on guest entry and exit timings?"
          value={Boolean(policies.entryExitRestrictions)}
          onChange={(value) => setPolicy("entryExitRestrictions", value)}
        />
        <YesNo
          label="Can guests invite outside visitors during their stay?"
          value={Boolean(policies.outsideVisitors)}
          onChange={(value) => setPolicy("outsideVisitors", value)}
        />
        <label>
          Music/noise policy
          <select
            value={String(policies.noisePolicy || "")}
            onChange={(event) => setPolicy("noisePolicy", event.target.value)}
          >
            <option value="">Select</option>
            <option>No loud music</option>
            <option>Quiet hours after 10 PM</option>
            <option>Music allowed in designated areas</option>
            <option>No restriction</option>
          </select>
        </label>
      </PolicySection>

      <PolicySection title="Pet Policy" count="2 rules">
        <YesNo
          label="Do any pets live on the property?"
          value={Boolean(policies.petsOnProperty)}
          onChange={(value) => setPolicy("petsOnProperty", value)}
        />
        <YesNo
          label="Are guest pets allowed?"
          value={Boolean(policies.petsAllowed)}
          onChange={(value) => setPolicy("petsAllowed", value)}
        />
      </PolicySection>

      <PolicySection title="Caretaker Information" count="Details & services">
        <YesNo
          label="Does the caretaker stay at the property?"
          value={Boolean(policies.caretakerStays)}
          onChange={(value) => setPolicy("caretakerStays", value)}
        />
        <label>
          Caretaker details
          <textarea
            maxLength={3000}
            placeholder="Please add caretaker details"
            value={String(policies.caretakerDetails || "")}
            onChange={(event) =>
              setPolicy("caretakerDetails", event.target.value)
            }
          />
        </label>
        <div className="policy-grid">
          <TimeSelect
            label="Available from"
            value={String(policies.caretakerFrom || "09:00")}
            onChange={(value) => setPolicy("caretakerFrom", value)}
          />
          <TimeSelect
            label="Available until"
            value={String(policies.caretakerUntil || "21:00")}
            onChange={(value) => setPolicy("caretakerUntil", value)}
          />
        </div>
        <CheckGroup
          label="Services the caretaker can help with"
          options={[
            "Cab Bookings",
            "Car/Bike Rentals",
            "Restaurant Reservations",
            "Pick-up and Drop Services",
          ]}
          values={(policies.caretakerServices as string[]) || []}
          onChange={(value) => setPolicy("caretakerServices", value)}
        />
        <CheckGroup
          label="Caretaker local knowledge"
          options={["Local places", "Activities of interest"]}
          values={(policies.caretakerKnowledge as string[]) || []}
          onChange={(value) => setPolicy("caretakerKnowledge", value)}
        />
        <YesNo
          label="Does the caretaker help in cleaning the property?"
          value={Boolean(policies.caretakerCleaning)}
          onChange={(value) => setPolicy("caretakerCleaning", value)}
        />
      </PolicySection>

      <PolicySection title="Key Exchange" count="4 rules">
        <YesNo
          label="Is self check-in via smart door available?"
          value={Boolean(policies.smartDoorCheckIn)}
          onChange={(value) => setPolicy("smartDoorCheckIn", value)}
        />
        <YesNo
          label="Does the host greet and help guests check-in?"
          value={Boolean(policies.hostCheckIn)}
          onChange={(value) => setPolicy("hostCheckIn", value)}
        />
        <YesNo
          label="Does the caretaker greet and help guests check-in?"
          value={Boolean(policies.caretakerCheckIn)}
          onChange={(value) => setPolicy("caretakerCheckIn", value)}
        />
        <YesNo
          label="Can guests collect or deposit keys through building staff?"
          value={Boolean(policies.staffKeyExchange)}
          onChange={(value) => setPolicy("staffKeyExchange", value)}
        />
      </PolicySection>

      <PolicySection title="Check-in and Check-out Policies" count="1 rule">
        <YesNo
          label="Do you provide 24-hour check-in?"
          value={Boolean(policies.twentyFourHourCheckIn)}
          onChange={(value) => setPolicy("twentyFourHourCheckIn", value)}
        />
      </PolicySection>
    </div>
  );
}

function PolicySection({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <section className="policy-section">
      <header>
        <div>
          <h3>{title}</h3>
          <span>{count}</span>
        </div>
        <ChevronDown />
      </header>
      <div className="policy-section-body">{children}</div>
    </section>
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
    <div className="policy-yes-no">
      <span>{label}</span>
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
function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {times.map((time) => (
          <option key={time}>{time}</option>
        ))}
      </select>
    </label>
  );
}
function CheckGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="policy-check-group">
      <legend>{label}</legend>
      {options.map((option) => (
        <label key={option}>
          <input
            type="checkbox"
            checked={values.includes(option)}
            onChange={() =>
              onChange(
                values.includes(option)
                  ? values.filter((value) => value !== option)
                  : [...values, option],
              )
            }
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}
