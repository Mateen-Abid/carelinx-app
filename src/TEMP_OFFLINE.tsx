/**
 * TEMP OFFLINE PAGE
 * Delete this file to bring CareLinx back online.
 */
export default function TempOffline() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f0f0f",
        margin: 0,
      }}
    >
      <h1
        style={{
          color: "#ffffff",
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          textAlign: "center",
          margin: 0,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        CareLinx is offline
      </h1>
    </div>
  );
}
