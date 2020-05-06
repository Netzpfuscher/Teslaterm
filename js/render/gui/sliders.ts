import * as $ from "jquery";
import {maxOntime} from "../../common/commands";
import {UD3State} from "../../common/IPCConstantsToRenderer";
import {SlidersIPC} from "../ipc/sliders";
import {terminal} from "./constants";

export class OntimeUI {
    get relativeVal(): number {
        return this.relativeValInt;
    }

    private readonly slider: HTMLInputElement;
    private relativeSelect: HTMLInputElement;
    private total: HTMLSpanElement;
    private relative: HTMLSpanElement;
    private absolute: HTMLSpanElement;
    private absoluteVal: number = 0;
    private relativeValInt: number = 100;
    private totalVal: number = 0;

    public constructor() {
        this.slider = ($(".w2ui-panel-content .scopeview #ontime #slider")[0] as HTMLInputElement);
        this.relativeSelect = ($(".w2ui-panel-content .scopeview #ontime #relativeSelect")[0] as HTMLInputElement);
        this.total = $(".w2ui-panel-content .scopeview #ontime #total")[0];
        this.relative = $(".w2ui-panel-content .scopeview #ontime #relative")[0];
        this.absolute = $(".w2ui-panel-content .scopeview #ontime #absolute")[0];
        this.slider.addEventListener("input", () => ontime.onSliderMoved());
        this.relativeSelect.onclick = () => ontime.onRelativeOntimeSelect();
    }

    public setRelativeAllowed(allow: boolean) {
        if (allow) {
            this.relativeSelect.disabled = false;
        } else {
            this.relativeSelect.checked = false;
            this.relativeSelect.onclick(new MouseEvent("click"));
            this.relativeSelect.disabled = true;
        }
    }

    public setToZero() {
        if (this.relativeSelect.checked) {
            this.setRelativeOntime(0);
        } else {
            this.setAbsoluteOntime(0);
        }
    }

    public setAbsoluteOntime(time: number) {
        if (!this.relativeSelect.checked) {
            setSliderValue(null, time, this.slider);
        }
        time = Math.min(maxOntime, Math.max(0, time));
        this.absoluteVal = time;
        this.absolute.textContent = this.absoluteVal.toString();
        this.ontimeChanged();
    }

    public setRelativeOntime(percentage: number) {
        console.log(this);
        if (this.relativeSelect.checked) {
            setSliderValue(null, percentage, this.slider);
        }
        percentage = Math.min(100, Math.max(0, percentage));
        this.relativeValInt = percentage;
        this.relative.textContent = this.relativeValInt.toString();
        this.ontimeChanged();
    }

    public updateOntimeLabels() {
        if (this.relativeSelect.checked) {
            this.relative.innerHTML = "<b>" + this.relativeValInt + "</b>";
            this.absolute.innerHTML = this.absoluteVal.toFixed();
        } else {
            this.absolute.innerHTML = "<b>" + this.absoluteVal + "</b>";
            this.relative.innerHTML = this.relativeValInt.toFixed();
        }
        this.total.innerHTML = this.totalVal.toFixed();
    }

    public onRelativeOntimeSelect() {
        if (this.relativeSelect.checked) {
            this.slider.max = "100";
            this.slider.value = this.relativeValInt.toFixed();
        } else {
            this.slider.max = maxOntime.toFixed();
            this.slider.value = this.absoluteVal.toFixed();
        }
        this.updateOntimeLabels();
    }

    public onSliderMoved() {
        if (this.relativeSelect.checked) {
            this.setRelativeOntime(parseInt(this.slider.value, 10));
        } else {
            this.setAbsoluteOntime(parseInt(this.slider.value, 10));
        }
    }

    public ontimeChanged() {
        this.totalVal = Math.round(this.absoluteVal * this.relativeValInt / 100.);
        SlidersIPC.setOntime(this.totalVal);
        this.updateOntimeLabels();
    }

    public markEnabled(enabled: boolean) {
        ontime.slider.className = enabled ? "slider" : "slider-gray";
    }
}

export let ontime: OntimeUI;

export function updateSliderAvailability(ud3State: UD3State) {
    const busMaybeActive = ud3State.busActive || !ud3State.busControllable;
    const offDisable = !(ud3State.transientActive && busMaybeActive);
    for (let i = 1; i <= 3; ++i) {
        const slider = $(".w2ui-panel-content .scopeview #slider" + i)[0];
        slider.className = offDisable ? "slider-gray" : "slider";
    }
    ontime.markEnabled(busMaybeActive);
}

export function init() {
    $("#slider1")[0].addEventListener("input", bpsSlider);
    $("#slider2")[0].addEventListener("input", burstOntimeSlider);
    $("#slider3")[0].addEventListener("input", burstOfftimeSlider);
    ontime = new OntimeUI();
}

function setSliderValue(name, value, slider?) {
    if (!slider) {
        slider = document.getElementById(name);
    }
    if (value < slider.min || value > slider.max) {
        terminal.io.println("Tried to set slider \"" + slider.id + "\" out of range (To " + value + ")!");
        value = Math.min(slider.max, Math.max(slider.min, value));
    }
    slider.value = value;
}

function bpsSlider() {
    const slider = document.getElementById("slider1") as HTMLInputElement;
    const slider_disp = document.getElementById("slider1_disp");
    slider_disp.innerHTML = slider.value + " Hz";
    SlidersIPC.setBPS(Number(slider.value));
}

export function setBPS(bps) {
    setSliderValue("slider1", bps);
    bpsSlider();
}

export function getBPS(): number {
    const slider = document.getElementById("slider1") as HTMLInputElement;
    return Number(slider.value);
}

function burstOntimeSlider() {
    const slider: HTMLInputElement = document.getElementById("slider2") as HTMLInputElement;
    const slider_disp = document.getElementById("slider2_disp");
    slider_disp.innerHTML = slider.value + " ms";
    SlidersIPC.setBurstOntime(Number(slider.value));
}

export function setBurstOntime(time) {
    setSliderValue("slider2", time);
    burstOntimeSlider();
}

export function getBurstOntime(): number {
    const slider = document.getElementById("slider2") as HTMLInputElement;
    return Number(slider.value);
}

function burstOfftimeSlider() {
    const slider = document.getElementById("slider3") as HTMLInputElement;
    const slider_disp = document.getElementById("slider3_disp");
    slider_disp.innerHTML = slider.value + " ms";
    SlidersIPC.setBurstOfftime(Number(slider.value));
}

export function setBurstOfftime(time) {
    setSliderValue("slider3", time);
    burstOfftimeSlider();
}

export function getBurstOfftime(): number {
    const slider = document.getElementById("slider3") as HTMLInputElement;
    return Number(slider.value);
}

