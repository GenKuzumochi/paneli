<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    backgroundColor: bg,
    color: fg,
    borderRadius: "6px",
    width: 96,
    height: 144,

  }}
>
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      width: "96px",

    }}>
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", margin: 8, fontSize: "42px", lineHeight: "36px" }}>
      <div>{suit}</div>
      <div style={{letterSpacing:"-5px"}}>{num}</div>
    </div>
  </div>
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      position: "absolute",
      bottom: 6,
      left: 8,
      fontSize: "20px",
      color: subcolor
    }}>{subtext}
  </div>

  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      width: "96px",
      position: "absolute",
      bottom: 0,
      color: subcolor,
      fontFamily: "Lobster"
    }}>
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", transform: "rotate(180deg)", margin: 8, fontSize: "28px", lineHeight: "24px" }}>
      <div>{suit}</div>
      <div>{num}</div>
    </div>
  </div>
</div>
