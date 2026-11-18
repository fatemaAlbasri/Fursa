// +973 phone box (the backend saves "+973" + 8 digits). Styled by .phone in index.css.
export default function PhoneInput({ value, onChange, placeholder = '3XXX XXXX', id }) {
  return (
    <div className="phone">
      <span className="phone__code">+973</span>
      <input
        id={id}
        name="phone"
        type="tel"
        inputMode="numeric"
        maxLength={9}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="off"
      />
    </div>
  )
}
