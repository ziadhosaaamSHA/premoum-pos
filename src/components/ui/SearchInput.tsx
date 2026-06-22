type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="search-bar-wrapper">
      <i className="bx bx-search"></i>
      <input
        type="text"
        className="table-search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
