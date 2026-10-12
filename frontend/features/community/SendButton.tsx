import styles from './sendButton.module.css';

/** The chat's submit button; the plane icon is drawn inline so it takes the button's colour. */
export function SendButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button type="submit" disabled={disabled} className={styles.send}>
      <span className={styles.plane} aria-hidden="true">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" />
        </svg>
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
