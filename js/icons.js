function icon(name, cls){
  cls = cls || 'ic';
  const S = `stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;
  const map = {
    home: `<circle cx="12" cy="12" r="9" ${S}/><path d="M8 12l4-4 4 4M12 8v8" ${S}/>`,
    compass: `<circle cx="12" cy="12" r="9" ${S}/><path d="M15 9l-2 6-6 2 2-6 6-2z" ${S}/>`,
    spark: `<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" ${S}/><circle cx="12" cy="12" r="2.4" ${S}/>`,
    target: `<circle cx="12" cy="12" r="8.5" ${S}/><circle cx="12" cy="12" r="4.5" ${S}/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>`,
    search: `<circle cx="10.5" cy="10.5" r="6.5" ${S}/><path d="M19 19l-4-4" ${S}/>`,
    calc: `<rect x="5" y="3" width="14" height="18" rx="3" ${S}/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" ${S}/>`,
    heart: `<path d="M12 20s-7-4.5-9.3-9C1.2 7.7 3 4.5 6.3 4.5c1.9 0 3.4 1 4.7 2.6C12.3 5.5 13.8 4.5 15.7 4.5c3.3 0 5.1 3.2 3.6 6.5C17 15.5 12 20 12 20z" ${S}/>`,
    layers: `<path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" ${S}/><path d="M4 12.5L12 17l8-4.5M4 16.5L12 21l8-4.5" ${S}/>`,
    users: `<circle cx="9" cy="8.5" r="3.2" ${S}/><path d="M2.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" ${S}/><circle cx="17" cy="8" r="2.4" ${S}/><path d="M15.5 13.6c2.7.5 4.5 2.4 4.5 5.4" ${S}/>`,
    shield: `<path d="M12 3l7 3v5.2c0 4.6-3 8.2-7 9.8-4-1.6-7-5.2-7-9.8V6l7-3z" ${S}/><path d="M9 12l2 2 4-4" ${S}/>`,
    chart: `<path d="M4 20V10M11 20V4M18 20v-7" ${S}/><path d="M2.5 20h19" ${S}/>`,
    plus: `<path d="M12 5v14M5 12h14" ${S}/>`,
    download: `<path d="M12 3v12M7 10l5 5 5-5" ${S}/><path d="M4 19h16" ${S}/>`,
    switch: `<path d="M7 7h13l-3-3M17 17H4l3 3" ${S}/>`,
    book: `<path d="M4 5.5c2.2-1 5.3-1 8 0v13c-2.7-1-5.8-1-8 0v-13z" ${S}/><path d="M20 5.5c-2.2-1-5.3-1-8 0v13c2.7-1 5.8-1 8 0v-13z" ${S}/>`,
    check: `<path d="M5 13l4 4L19 7" ${S}/>`,
    menu: `<path d="M4 7h16M4 12h16M4 17h16" ${S}/>`,
    close: `<path d="M6 6l12 12M18 6L6 18" ${S}/>`,
    warn: `<path d="M12 3l10 18H2L12 3z" ${S}/><path d="M12 10v4M12 17h.01" ${S}/>`,
    chevron: `<path d="M9 6l6 6-6 6" ${S}/>`,
    building: `<rect x="4" y="9" width="7" height="12" ${S}/><rect x="13" y="4" width="7" height="17" ${S}/><path d="M6.5 12h2M6.5 15h2M6.5 18h2M15.5 7h2M15.5 10h2M15.5 13h2M15.5 16h2" ${S}/>`,
    leaf: `<path d="M4 20c0-9 6-15 16-15-1 10-7 16-16 15z" ${S}/><path d="M6 18c4-4 7-7 12-12" ${S}/>`,
    flask: `<path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" ${S}/><path d="M7.5 15h9" ${S}/>`,
    coin: `<circle cx="12" cy="12" r="9" ${S}/><path d="M12 7v10M9.5 9.5c0-1.4 1.2-2.2 2.5-2.2s2.5.9 2.5 2.1c0 3-5 1.6-5 4.5 0 1.3 1.2 2.1 2.5 2.1s2.5-.8 2.5-2.1" ${S}/>`,
    trophy: `<path d="M7 4h10v4a5 5 0 0 1-10 0V4z" ${S}/><path d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" ${S}/><path d="M12 13v3M9 20h6M10 17h4v3h-4z" ${S}/>`,
    edit: `<path d="M4 20l1-4 11-11 3 3-11 11-4 1z" ${S}/>`,
    trash: `<path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" ${S}/>`,
    logout: `<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" ${S}/><path d="M13 8l4 4-4 4M17 12H9" ${S}/>`,
  };
  return `<svg class="${cls}" viewBox="0 0 24 24">${map[name]||map.spark}</svg>`;
}
