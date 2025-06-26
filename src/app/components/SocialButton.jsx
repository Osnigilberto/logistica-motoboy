'use client';

import styles from './SocialButton.module.css';

export default function SocialButton({ onClick, children, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={styles.button}
      aria-label={label}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}
