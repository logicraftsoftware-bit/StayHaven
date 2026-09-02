"use client";

import { Check } from "lucide-react";
import { useState } from "react";

const amenityGroups = [
  {
    title: "Mandatory",
    items: [
      "Air Conditioning",
      "Parking",
      "Room service",
      "Swimming Pool",
      "Wifi",
      "Reception",
      "Bar",
      "Restaurant",
      "Luggage assistance",
      "Wheelchair",
      "Gym/ Fitness centre",
      "CCTV",
      "Airport Transfers",
      "Elevator/ Lift",
      "Housekeeping",
      "Kitchen/Kitchenette",
      "Power backup",
      "Caretaker",
      "Spa",
      "Kids' Play Area",
    ],
  },
  {
    title: "General Services",
    items: [
      "Laundry",
      "Newspaper",
      "Smoking rooms",
      "Lounge",
      "First-aid services",
      "Concierge",
      "Multilingual Staff",
      "Cloak Room",
      "Specially abled assistance",
      "Butler Services",
      "Doctor on call",
      "Medical centre (Within Premise)",
      "Pool/ Beach towels",
    ],
  },
  {
    title: "Security",
    items: [
      "Smoke detector",
      "Fire extinguishers",
      "Security alarms",
      "Security Guard",
      "Carbon Monoxide Detector",
      "Door-Eye",
      "Door Chain",
    ],
  },
  {
    title: "Basic Facilities",
    items: [
      "LAN",
      "Refrigerator",
      "Umbrellas",
      "Washing Machine",
      "Laundromat",
      "EV Charging Station (Within Premise)",
      "Driver's Accommodation",
      "Grocery Purchase",
      "Utensil Cleaning",
    ],
  },
  {
    title: "Outdoor Sports & Activities",
    items: [
      "Beach",
      "Golf Course / Mini Golf",
      "Outdoor sports",
      "Skiing",
      "Cycling",
      "Rock Climbing",
      "Ziplining",
      "Archery",
      "Tennis",
      "Basketball court",
      "Cricket",
      "Badminton",
      "Volley Ball",
      "High rope course",
      "Paintball",
      "Paragliding",
      "Camping",
      "Hot Air Balloon Ride",
      "Air Rifle Shooting",
      "Football/Soccer",
      "Pickle Ball",
      "ATV or Buggy Ride",
      "Zorbing",
      "Wall Climbing",
      "Bungee Jumping",
      "Beach Volley / Football",
      "Golf Simulator",
      "Rappelling",
    ],
  },
  {
    title: "Common Area",
    items: [
      "Balcony/ Terrace",
      "Garden",
      "Sun Deck",
      "Prayer Room",
      "Living Room",
      "Outdoor Furniture",
    ],
  },
  {
    title: "Food and Drink",
    items: [
      "Barbeque",
      "Dining Area",
      "Kid's Menu",
      "Breakfast",
      "Food Options Available",
      "Indian Chef",
      "Cook Service",
    ],
  },
  {
    title: "Business Center and Conferences",
    items: [
      "Banquet",
      "Business Center",
      "Conference room",
      "Photocopying",
      "Fax service",
      "Printer",
    ],
  },
  {
    title: "Transfers",
    items: [
      "Pickup/ Drop",
      "Shuttle Service",
      "Railway Station Transfers",
      "Bus Station transfers",
    ],
  },
  {
    title: "Entertainment",
    items: [
      "Events",
      "Professional Photography",
      "Night Club",
      "Beach club",
      "Movie Room",
      "Music System",
    ],
  },
  {
    title: "Shopping",
    items: [
      "Grocery/Supermarket (Within Premise)",
      "Souvenir shop",
      "Jewellery Shop",
    ],
  },
  {
    title: "Media and technology",
    items: [
      "TV",
      "Smart TV",
      "Telephone",
      "Cable channels",
      "Satellite channels",
      "Music System",
      "Projector",
      "Home Theatre",
    ],
  },
];

export function PropertyAmenities({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [active, setActive] = useState(amenityGroups[0].title);
  const group =
    amenityGroups.find((item) => item.title === active) || amenityGroups[0];
  const toggle = (item: string) =>
    onChange(
      values.includes(item)
        ? values.filter((value) => value !== item)
        : [...values, item],
    );

  return (
    <section className="property-amenities-manager">
      <header>
        <h2>All Amenities</h2>
        <p>
          Select all amenities available at your property. Complete the
          Mandatory section first.
        </p>
      </header>
      <div className="property-amenities-layout">
        <nav>
          {amenityGroups.map((item) => {
            const count = item.items.filter((amenity) =>
              values.includes(amenity),
            ).length;
            return (
              <button
                type="button"
                className={item.title === group.title ? "active" : ""}
                key={item.title}
                onClick={() => setActive(item.title)}
              >
                <span>{item.title}</span>
                <b>{count}</b>
              </button>
            );
          })}
        </nav>
        <div className="property-amenity-panel">
          <div className="property-amenity-panel-title">
            <div>
              <span>AMENITY CATEGORY</span>
              <h3>{group.title}</h3>
            </div>
            <small>
              {group.items.filter((item) => values.includes(item)).length} of{" "}
              {group.items.length} selected
            </small>
          </div>
          <div className="property-amenity-list">
            {group.items.map((item) => {
              const checked = values.includes(item);
              return (
                <label className={checked ? "selected" : ""} key={item}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item)}
                  />
                  <i>{checked && <Check />}</i>
                  <span>{item}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
