"use client";
import ServiceOptionCard from "./ServiceOptionCard";
type SelectorOption = { id: string; name: string; description?: string; selected?: boolean; disabled?: boolean; soldOut?: boolean; expired?: boolean; price?: React.ReactNode };
export default function RegistrationServiceSelector({ meals = [], accommodation = [], onMealSelectionChange, onAccommodationSelectionChange }: { meals?: readonly SelectorOption[]; accommodation?: readonly SelectorOption[]; onMealSelectionChange?: (ids: string[]) => void; onAccommodationSelectionChange?: (ids: string[]) => void }) {
  const group = (title: string, options: readonly SelectorOption[], onChange?: (ids: string[]) => void) => options.length ? <section className="space-y-2"><h3 className="text-sm font-bold text-[#06201c]">{title}</h3>{options.map((option) => <ServiceOptionCard key={option.id} {...option} availability={option.soldOut ? "Sold out" : option.expired ? "Expired" : undefined} disabled={option.disabled || option.soldOut || option.expired} onSelect={onChange ? () => onChange(options.filter((item) => item.id === option.id ? !item.selected : item.selected).map((item) => item.id)) : undefined} />)}</section> : null;
  return <div className="space-y-5">{group("Meals", meals, onMealSelectionChange)}{group("Accommodation", accommodation, onAccommodationSelectionChange)}</div>;
}
