"use client";

import React from "react";
import styles from "./login.module.css";

export default function SocialButton({ onClick, icon: Icon, text }) {
  return (
    <button onClick={onClick} className={styles.googleButton}>
      {Icon && <Icon size={22} className={styles.googleIcon} />}
      {text}
    </button>
  );
}
