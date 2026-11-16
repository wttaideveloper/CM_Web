import type { AvailabilityScheduleItem, ServiceGeneratedAvailabilityDay } from "../types/service.types";
import { formatServiceAvailabilityDate } from "../service.models";

type ServiceAvailabilityScheduleProps = {
  configuredSchedule?: AvailabilityScheduleItem[];
  generatedAvailability?: ServiceGeneratedAvailabilityDay[];
};

type ConfiguredScheduleRow = {
  day: string;
  endTime: string | null;
  isAvailable: boolean;
  slotLength: string | null;
  startTime: string | null;
};

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeConfiguredSchedule(
  schedule: AvailabilityScheduleItem[] | undefined,
): ConfiguredScheduleRow[] {
  if (!Array.isArray(schedule)) {
    return [];
  }

  return schedule.flatMap((entry) => {
    const day = readOptionalString(entry.day);

    if (!day) {
      return [];
    }

    return [{
      day,
      endTime: readOptionalString(entry.end_time),
      isAvailable: entry.is_available !== false,
      slotLength: readOptionalString(entry.slot_length),
      startTime: readOptionalString(entry.start_time),
    }];
  });
}

/**
 * Displays configured weekly hours and backend-generated slot ranges without
 * implying that the generated ranges are reserved or currently bookable.
 */
export function ServiceAvailabilitySchedule({
  configuredSchedule,
  generatedAvailability,
}: ServiceAvailabilityScheduleProps) {
  const configuredRows = normalizeConfiguredSchedule(configuredSchedule);
  const generatedRows = Array.isArray(generatedAvailability) ? generatedAvailability : [];

  return (
    <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-[#06201c]">Availability Schedule</h3>
        <p className="mt-1 text-sm text-[#52736a]">
          Configured working hours and backend-generated slot ranges.
        </p>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-bold text-[#06201c]">Configured weekly hours</h4>
        {configuredRows.length === 0 ? (
          <p className="mt-2 text-sm text-[#52736a]">No weekly working hours configured.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {configuredRows.map((row, index) => (
              <div
                key={`${row.day}-${index}`}
                className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4"
              >
                <p className="text-sm font-bold text-[#06201c]">{row.day}</p>
                <p className="mt-1 text-sm text-[#52736a]">
                  {row.isAvailable && row.startTime && row.endTime
                    ? `${row.startTime} – ${row.endTime}`
                    : "Not available"}
                </p>
                {row.isAvailable && row.slotLength ? (
                  <p className="mt-1 text-xs text-[#7f9d94]">Slot length: {row.slotLength}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {generatedRows.length > 0 ? (
        <div className="mt-5 border-t border-[#edf3f0] pt-4">
          <h4 className="text-sm font-bold text-[#06201c]">Backend-generated slots</h4>
          <p className="mt-1 text-xs text-[#7f9d94]">
            These ranges are informational and do not confirm booking or seat availability.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generatedRows.map((entry) => {
              const formattedDate = formatServiceAvailabilityDate(entry.date);

              if (!formattedDate) {
                return null;
              }

              return (
                <div
                  key={`${entry.date}-${entry.day}`}
                  className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4"
                >
                  <p className="text-sm font-bold text-[#06201c]">{entry.day}</p>
                  <p className="mt-1 text-xs font-semibold text-[#52736a]">{formattedDate}</p>
                  {entry.slots.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.slots.map((slot) => (
                        <span
                          key={slot}
                          className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-semibold text-[#16825b]"
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[#7f9d94]">No generated slots returned.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
