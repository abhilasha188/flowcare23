import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import FormField from './FormField';

function PasswordInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  hint,
  minLength,
  maxLength,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      {(messageId) => (
        <div className="input-wrap">
          <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
          <input
            id={id}
            name={id}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            autoComplete={autoComplete}
            minLength={minLength}
            maxLength={maxLength}
            aria-invalid={Boolean(error)}
            aria-describedby={messageId}
          />
          <button
            className="visibility-toggle"
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      )}
    </FormField>
  );
}

export default PasswordInput;
