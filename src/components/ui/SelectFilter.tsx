type SelectFilterOption = {
  value: string;
  label: string;
};

type SelectFilterProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectFilterOption[];
};

export default function SelectFilter({ value, onChange, options }: SelectFilterProps) {
  return (
    <select className="select-filter" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
