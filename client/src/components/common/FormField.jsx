function FormField({ id, label, error, hint, children }) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`form-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(messageId)}
      {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
      {!error && hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}

export default FormField;
