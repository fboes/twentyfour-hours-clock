class TwentyfourHourClock extends HTMLElement {
    static get observedAttributes() {
        return ["datetime", "longitude", "latitude", "frequency", "twilight-degree"];
    }
    constructor() {
        var _a, _b, _c, _d, _e;
        super();
        this.width = 256;
        this.height = 256;
        this._twilightDegree = -6;
        this.interval = 1000;
        this.elements = {
            style: document.createElement("style"),
            svg: document.createElement("span"),
        };
        this.ts = new Date().getTime();
        if (this.getAttribute("longitude") === "auto" || this.getAttribute("latitude") === "auto") {
            navigator.geolocation.getCurrentPosition((pos) => {
                const crd = pos.coords;
                console.log(crd);
                this._latitude = crd.latitude;
                this._longitude = crd.longitude;
                this.drawNewDay();
            });
        }
        this.width = (_a = this.getAttributeNumerical("width")) !== null && _a !== void 0 ? _a : this.width;
        this.height = (_b = this.getAttributeNumerical("height")) !== null && _b !== void 0 ? _b : this.height;
        this._longitude = (_c = this.getAttributeNumerical("longitude")) !== null && _c !== void 0 ? _c : this._longitude;
        this._latitude = (_d = this.getAttributeNumerical("latitude")) !== null && _d !== void 0 ? _d : this._latitude;
        this._twilightDegree = (_e = this.getAttributeNumerical("twilight-degree")) !== null && _e !== void 0 ? _e : this._twilightDegree;
        const dt = this.getAttribute("datetime");
        this._datetime = dt ? new Date(dt) : new Date();
        this.sunState =
            this._longitude !== undefined && this._latitude !== undefined
                ? new TwentyfourSun(this._longitude, this._latitude, this._datetime, 0)
                : undefined;
        this.elements.style.innerHTML = this.getStyle();
        this.elements.svg.innerHTML = this.getSvg();
        let shadowRoot = this.attachShadow({ mode: "open" });
        this.elements.svg.appendChild(this.elements.style);
        shadowRoot.appendChild(this.elements.svg);
    }
    connectedCallback() {
        var _a;
        // Start timer
        this.frequency = (_a = this.getAttributeNumerical("frequency")) !== null && _a !== void 0 ? _a : (1000 / this.interval);
    }
    disconnectedCallback() {
        this.intervalTimer && clearInterval(this.intervalTimer);
    }
    attributeChangedCallback(attrName, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        switch (attrName) {
            case "datetime":
                this.datetime = new Date(newValue);
                break;
            case "frequency":
                this.frequency = Number(newValue);
                break;
            case "twilight-degree":
                this.twilightDegree = Number(newValue);
                break;
            case "longitude":
                this.longitude = Number(newValue);
                break;
            case "latitude":
                this.latitude = Number(newValue);
                break;
        }
    }
    set datetime(datetime) {
        this._datetime = datetime;
        // no reflection to attribute
        this.drawNewDay();
    }
    get datetime() {
        return this._datetime;
    }
    set frequency(frequency) {
        // no reflection to attribute
        this.elements.svg.querySelector("#watchhand-seconds").style.opacity =
            frequency < 1 ? "0" : "100";
        this.interval = 1000 / Math.round(frequency);
        this.intervalTimer && clearInterval(this.intervalTimer);
        if (frequency > 0) {
            this.intervalTimer = setInterval(() => {
                this.rotateWatchhands();
            }, this.interval);
        }
    }
    get frequency() {
        return 1000 / this.interval;
    }
    set twilightDegree(twilightDegree) {
        this._twilightDegree = twilightDegree;
        // no reflection to attribute
        this.drawNewDay();
    }
    get twilightDegree() {
        return this._twilightDegree;
    }
    set longitude(longitude) {
        this._longitude = longitude;
        // no reflection to attribute
        this.drawNewDay();
    }
    get longitude() {
        return this._longitude;
    }
    set latitude(latitude) {
        this._latitude = latitude;
        // no reflection to attribute
        this.drawNewDay();
    }
    get latitude() {
        return this._latitude;
    }
    getAttributeNumerical(attrName) {
        const attr = this.getAttribute(attrName);
        return attr !== null ? Number(attr) : null;
    }
    getStyle() {
        const leUnit = this.lengthStroke;
        return `
:host {
  display: inline-block;
  --color-background: black;
  --color-foreground: white;
  --color-watchhand: orange;
  --color-night: #0f396c;
  --color-twilight: #1d6fd3;
  --color-day: #a1c5f2;
  --stroke-width: ${leUnit / 5}px;
  --stroke-width-watchhand: ${leUnit / 2.5}px;
  --stroke-width-daylight: ${leUnit / 2.5}px;
}
svg {
  fill: var(--color-background);
  color: var(--color-foreground);
  stroke-linecap: round;
  stroke-linejoin: round;
  width: 100%;
  height: auto;
}
line, polyline, circle {
  stroke: currentColor;
  stroke-width: var(--stroke-width);
  fill: transparent;
}
.light {
  stroke-width: var(--stroke-width-daylight);
  stroke-linecap: butt;
}
.light-night { stroke: var(--color-night); }
.light-dusk, .light-dawn { stroke: var(--color-twilight); }
.light-day { stroke: var(--color-day); }
#watchhand-hours, #watchhand-minutes,
#watchhand-hours-utc {
  color: var(--color-watchhand);
  stroke-width: var(--stroke-width-watchhand);
}
#watchhand-hours-utc {
  stroke: none;
  fill: currentColor;
}
text, polygon {
  fill: currentColor;
  paint-order: stroke;
  stroke-width: var(--stroke-width-watchhand);
  stroke: var(--color-background);
  stroke-opacity: 0.5;
  font-size: ${leUnit * 2}px;
}
.small {
  ${leUnit <= 2.5 ? "display: none" : ""}
}
`;
    }
    getSvg() {
        const center = this.center;
        const lengthStroke = this.lengthStroke;
        const lengthStrokePrimary = this.lengthStrokePrimary;
        const radiusMinutes = center.y - this.radiusMinutes;
        const radiusHours = center.y - this.radiusHours;
        let svg = `<svg width="${this.width}" height="${this.height}" version="1.1" viewBox="0 0 ${this.width} ${this.height}" xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">`;
        svg += `<rect x="0" y="0" width="${this.width}" height="${this.height}"></rect>`;
        svg += `<g inkscape:groupmode="layer" inkscape:label="Sun state disc" id="sunstate">`;
        svg += this.getSvgCircle();
        svg += `</g>`;
        svg += `<g inkscape:groupmode="layer" inkscape:label="Watchhands">`;
        svg += `<line id="watchhand-seconds" x1="${center.x}" y1="${center.y}" x2="${center.x}" y2="${radiusMinutes + lengthStroke * 1.5}" transform="rotate(${this.angleSeconds} ${center.x} ${center.y})" />`;
        svg += `<line id="watchhand-minutes" x1="${center.x}" y1="${center.y}" x2="${center.x}" y2="${radiusMinutes + lengthStroke * 2.4}" transform="rotate(${this.angleMinutes} ${center.x} ${center.y})" />`;
        svg += `<line id="watchhand-hours" x1="${center.x}" y1="${center.y}" x2="${center.x}" y2="${radiusHours + lengthStroke * 2.4}" transform="rotate(${this.angleHours} ${center.x} ${center.y})" />`;
        svg += `<circle id="watchhand-hours-utc" cx="${center.x}" cy="${radiusHours + lengthStroke * 2.4}" r="${lengthStroke / 2.5}" transform="rotate(${this.angleHoursUtc} ${center.x} ${center.y})" />`;
        svg += `</g>`;
        svg += `<g inkscape:groupmode="layer" inkscape:label="Minutes">`;
        svg += `<circle cx="${center.x}" cy="${center.y}" r="${this.radiusMinutes}" />`;
        for (let minutes = 0; minutes < 60; minutes++) {
            const angle = minutes * 6;
            const primary = minutes % 5 === 0;
            svg += `<line x1="${center.x}" y1="${radiusMinutes}" x2="${center.x}" y2="${radiusMinutes + (primary ? lengthStrokePrimary : lengthStroke)}" transform="rotate(${angle} ${center.x} ${center.y})" class="${primary ? "primary" : "small"}" />`;
            if (minutes === 0) {
                svg += `<polygon points="${center.x - lengthStrokePrimary * 0.66},${radiusMinutes + lengthStrokePrimary} ${center.x},${radiusMinutes + lengthStrokePrimary + lengthStrokePrimary} ${center.x + lengthStrokePrimary * 0.66},${radiusMinutes + lengthStrokePrimary}" />`;
            }
            else if (primary) {
                svg += `<text x="${center.x}" y="${radiusMinutes + lengthStrokePrimary + lengthStrokePrimary}" text-anchor="middle" transform="rotate(${angle} ${center.x} ${center.y})" class="${minutes % 15 === 0 ? "" : "small"}">${minutes.toFixed().padStart(2, "0")}</text>`;
            }
        }
        svg += `</g>`;
        svg += `<g inkscape:groupmode="layer" inkscape:label="Hours">`;
        for (let hours = 0; hours < 24; hours += 1) {
            const angle = hours * 15 + 180;
            const primary = hours % 3 === 0;
            svg += `<line x1="${center.x}" y1="${radiusHours + (hours === 12 ? -7 : 0)}" x2="${center.x}" y2="${radiusHours + (primary ? lengthStrokePrimary : lengthStroke)}" transform="rotate(${angle} ${center.x} ${center.y})" class="${primary ? "primary" : ""}" />`;
            if (primary) {
                svg += `<text x="${center.x}" y="${radiusHours + lengthStrokePrimary + lengthStrokePrimary}" text-anchor="middle" transform="rotate(${angle} ${center.x} ${center.y})" class="${hours % 6 === 0 ? "" : "small"}">${hours.toFixed().padStart(2, "0")}</text>`;
            }
        }
        svg += `</g>`;
        svg += `<g inkscape:groupmode="layer" inkscape:label="Extra information">`;
        /*svg += `<text id="utc" class="small" x="${center.x}" y="${
          center.y - lengthStrokePrimary
        }" text-anchor="middle">UTC ${this.getTimezoneOffset()}</text>`;*/
        svg += `<text id="date" class="small" x="${center.x}" y="${center.y + lengthStrokePrimary * 2}" text-anchor="middle">${this.getDate()}</text>`;
        svg += `</g>`;
        svg += `</svg>`;
        return svg;
    }
    getTimezoneOffset() {
        const utcOffset = this._datetime.getTimezoneOffset();
        return ((utcOffset > 1 ? "+" : "-") +
            Math.floor(Math.abs(utcOffset / 60))
                .toFixed()
                .padStart(2, "0") +
            ":" +
            (utcOffset % 60).toFixed().padStart(2, "0"));
    }
    getDate() {
        return (this._datetime.getFullYear() +
            "-" +
            (this._datetime.getMonth() + 1).toFixed().padStart(2, "0") +
            "-" +
            this._datetime.getDate().toFixed().padStart(2, "0"));
    }
    getSvgCircle() {
        const center = this.center;
        const radiusHours = this.radiusHours;
        const polyCoordinates = [];
        let currentCoordinates = [];
        let lastLight = this.getLight(0, 0);
        for (let hours = 0; hours < 24; hours++) {
            for (let minutes = 0; minutes < 60; minutes += 5) {
                const angle = (hours + minutes / 60) * 15;
                const c = this.getCircleCoordinates(angle, radiusHours);
                c[0] += center.x;
                c[1] += center.y;
                const thisLight = this.getLight(hours, minutes);
                if (thisLight !== lastLight) {
                    currentCoordinates.push(c.join(","));
                    polyCoordinates.push(`<polyline class="light light-${lastLight}" points="${currentCoordinates.join(" ")}" />`);
                    currentCoordinates = [];
                }
                lastLight = thisLight;
                currentCoordinates.push(c.join(","));
            }
        }
        currentCoordinates.push([center.x, center.y + radiusHours].join(","));
        polyCoordinates.push(`<polyline class="light light-${lastLight}" points="${currentCoordinates.join(" ")}" />`);
        return polyCoordinates.join();
    }
    drawNewDay() {
        this.sunState =
            this._longitude !== undefined && this._latitude !== undefined
                ? new TwentyfourSun(this._longitude, this._latitude, this._datetime, 0)
                : undefined;
        this.elements.svg.querySelector("#sunstate").innerHTML = this.getSvgCircle();
        this.elements.svg.querySelector("#date").innerHTML = this.getDate();
    }
    getLight(hours, minutes) {
        if (!this.sunState) {
            return "day";
        }
        this.sunState.localHours = hours + minutes / 60;
        return this.sunState.getSunState(this.twilightDegree);
    }
    getCircleCoordinates(angle, radius) {
        return [Math.sin((-angle / 180) * Math.PI) * radius, Math.cos((angle / 180) * Math.PI) * radius];
    }
    rotateWatchhands() {
        const oldDate = this.getDate();
        const ts = new Date().getTime();
        const elapsedTime = ts - this.ts;
        this.ts = ts;
        const center = this.center;
        this._datetime.setMilliseconds(this._datetime.getMilliseconds() + elapsedTime);
        this.elements.svg.querySelector("#watchhand-seconds").setAttribute("transform", `rotate(${this.angleSeconds} ${center.x} ${center.y})`);
        this.elements.svg.querySelector("#watchhand-minutes").setAttribute("transform", `rotate(${this.angleMinutes} ${center.x} ${center.y})`);
        this.elements.svg.querySelector("#watchhand-hours").setAttribute("transform", `rotate(${this.angleHours} ${center.x} ${center.y})`);
        this.elements.svg.querySelector("#watchhand-hours-utc").setAttribute("transform", `rotate(${this.angleHoursUtc} ${center.x} ${center.y})`);
        //(this.elements.svg.querySelector("#utc") as SVGTextElement).innerHTML = "UTC " + this.getTimezoneOffset();
        if (oldDate !== this.getDate()) {
            this.drawNewDay();
        }
    }
    get center() {
        return { x: this.width / 2, y: this.height / 2 };
    }
    get radius() {
        return Math.min(this.width, this.height) / 2;
    }
    get radiusMinutes() {
        return Math.round(this.radius * 0.95);
    }
    get radiusHours() {
        return Math.round(this.radius * 0.7);
    }
    get lengthStroke() {
        return Math.max(2.5, Math.max(Math.round(this.radius * 0.05)));
    }
    get lengthStrokePrimary() {
        return Math.round(this.radius * 0.1);
    }
    get angleHours() {
        return ((this._datetime.getHours() + this._datetime.getMinutes() / 60 + this._datetime.getSeconds() / 3600) * 15 + 180);
    }
    get angleHoursUtc() {
        return ((this._datetime.getUTCHours() + this._datetime.getUTCHours() / 60 + this._datetime.getUTCSeconds() / 3600) * 15 +
            180);
    }
    get angleMinutes() {
        return (this._datetime.getMinutes() + this._datetime.getSeconds() / 60) * 6;
    }
    get angleMinutesUtc() {
        return (this._datetime.getUTCMinutes() + this._datetime.getUTCSeconds() / 60) * 6;
    }
    get angleSeconds() {
        const ms = this.interval !== 1000 ? (Math.round(this._datetime.getMilliseconds() / this.interval) * this.interval / 1000) : 0;
        return (this._datetime.getSeconds() + ms) * 6;
    }
}
export class TwentyfourSun {
    constructor(longitude, latitude, date, localHours) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.date = date;
        this.localHours = localHours;
    }
    get solarTimeZoneOffset() {
        return Math.round((this.longitude / 180) * 12);
    }
    /**
     *@see https://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
     */
    get dayOfYear() {
        return ((Date.UTC(this.date.getFullYear(), this.date.getMonth(), this.date.getDate()) -
            Date.UTC(this.date.getFullYear(), 0, 0)) /
            24 /
            60 /
            60 /
            1000);
    }
    /**
     * In hours
     */
    get localTime() {
        return this.localHours + this.solarTimeZoneOffset + this.date.getTimezoneOffset() / 60;
    }
    /**
     * In degrees
     */
    get localSolarTimeMeridian() {
        return Math.round(this.longitude / 15) * 15;
    }
    /**
     * In minutes
     */
    get equationOfTime() {
        const b = ((2 * Math.PI) / 365) * (this.dayOfYear - 81);
        return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    }
    /**
     * In minutes
     */
    get timeCorrectionFactor() {
        return 4 * (this.longitude - this.localSolarTimeMeridian) + this.equationOfTime;
    }
    /**
     * In hours
     */
    get localSolarTime() {
        return (this.localTime + this.timeCorrectionFactor / 60 + 24) % 24;
    }
    /**
     * In radians
     */
    get hourAngle() {
        return (2 / 24) * Math.PI * (this.localSolarTime - 12);
    }
    /**
     * In radians
     */
    get sunDeclination() {
        const delta = 23.45 * Math.sin(((2 * Math.PI) / 365) * (this.dayOfYear - 81));
        return (delta / 180) * Math.PI;
    }
    /**
     * In radians
     * @see https://www.pveducation.org/pvcdrom/properties-of-sunlight/the-suns-position
     */
    get solarElevationAngle() {
        const delta = this.sunDeclination;
        const phi = (this.latitude / 180) * Math.PI;
        return Math.asin(Math.sin(delta) * Math.sin(phi) + Math.cos(delta) * Math.cos(phi) * Math.cos(this.hourAngle));
    }
    /**
     * @returns `sunState` for civil twilight
     */
    getSunState(degree = -6) {
        const solarElevationAngleDeg = (this.solarElevationAngle / Math.PI) * 180;
        let sunState = TwentyfourSun.SUN_STATE_NIGHT;
        if (solarElevationAngleDeg >= 0) {
            sunState = TwentyfourSun.SUN_STATE_DAY;
        }
        else if (solarElevationAngleDeg <= degree) {
            sunState = TwentyfourSun.SUN_STATE_NIGHT;
        }
        else {
            sunState = this.localSolarTime < 12 ? TwentyfourSun.SUN_STATE_DUSK : TwentyfourSun.SUN_STATE_DAWN;
        }
        return sunState;
    }
}
TwentyfourSun.SUN_STATE_DAY = "day";
TwentyfourSun.SUN_STATE_NIGHT = "night";
TwentyfourSun.SUN_STATE_DUSK = "dusk";
TwentyfourSun.SUN_STATE_DAWN = "dawn";
customElements.define("twentyfour-hours-clock", TwentyfourHourClock);
