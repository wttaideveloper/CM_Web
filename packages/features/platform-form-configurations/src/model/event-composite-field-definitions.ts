/** One configurable nested property of a composite Event core field. */
export type EventCompositeSubfieldDefinition = {
  key: string;
  label: string;
  group?: string;
};

/** Semantic metadata used to configure and preview composite Event core fields. */
export type EventCompositeFieldDefinition = {
  title: string;
  description: string;
  fieldNoun: string;
  subfields: readonly EventCompositeSubfieldDefinition[];
};

/** Central registry for backend-supported composite Event core fields. */
export const eventCompositeFieldDefinitions: Readonly<Record<string, EventCompositeFieldDefinition>> = {
  ticket_types: {
    title: "Ticket Types",
    description: "Configure the ticket properties collected for each ticket type.",
    fieldNoun: "ticket",
    subfields: [
      { key: "name", label: "Name" },
      { key: "price", label: "Price" },
      { key: "currency", label: "Currency" },
      { key: "capacity", label: "Capacity" },
    ],
  },
  sessions: {
    title: "Sessions",
    description: "Configure the properties collected for each session.",
    fieldNoun: "session",
    subfields: [
      { key: "session_date", label: "Date" },
      { key: "title", label: "Title" },
      { key: "speaker", label: "Speaker" },
      { key: "start_time", label: "Start time" },
      { key: "end_time", label: "End time" },
      { key: "location", label: "Location" },
    ],
  },
  venue: {
    title: "Venue",
    description: "Configure the venue details collected for this Event.",
    fieldNoun: "venue",
    subfields: [
      { key: "name", label: "Name" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "coordinates.lat", label: "Latitude", group: "Coordinates" },
      { key: "coordinates.lng", label: "Longitude", group: "Coordinates" },
    ],
  },
  custom_fields: {
    title: "Registration Questions",
    description: "Enable the registration-question capability and its supported parts.",
    fieldNoun: "registration question",
    subfields: [
      { key: "label", label: "Label" },
      { key: "options", label: "Options" },
    ],
  },
  primary_image: { title: "Primary Image", description: "Configure this Event's primary image capability.", fieldNoun: "primary image", subfields: [] },
  gallery_images: { title: "Gallery Images", description: "Configure this Event's gallery image capability.", fieldNoun: "gallery image", subfields: [] },
  videos: { title: "Videos", description: "Configure this Event's video capability.", fieldNoun: "video", subfields: [] },
  documents: { title: "Documents", description: "Configure this Event's document capability.", fieldNoun: "document", subfields: [] },
  tags: { title: "Tags", description: "Configure this Event's tag collection capability.", fieldNoun: "tag", subfields: [] },
};

/** Returns composite metadata only for a recognised Event core field key. */
export function getEventCompositeFieldDefinition(coreKey: string | null): EventCompositeFieldDefinition | undefined {
  return coreKey ? eventCompositeFieldDefinitions[coreKey] : undefined;
}
