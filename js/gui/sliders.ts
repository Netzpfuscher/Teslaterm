import {busActive, busControllable, transientActive} from "../network/telemetry";
import * as $ from "jquery";
import {terminal} from "./gui";
import * as commands from '../network/commands';
import * as midiServer from '../midi/midi_server';

class OntimeUI {
    slider: HTMLInputElement;
    relativeSelect: HTMLInputElement;
    total: HTMLSpanElement;
    relative: HTMLSpanElement;
    absolute: HTMLSpanElement;
    absoluteVal: number;
    relativeVal: number;
    totalVal: number;

    setRelativeAllowed(allow:boolean) {
        if (allow) {
            this.relativeSelect.disabled = false;
        } else {
            this.relativeSelect.checked = false;
            this.relativeSelect.onclick(new MouseEvent("click"));
            this.relativeSelect.disabled = true;
        }
    }



    setAbsoluteOntime(time) {
        if (!this.relativeSelect.checked) {
            setSliderValue(null, time, this.slider);
        }
        time = Math.min(commands.maxOntime, Math.max(0, time));
        this.absolute.textContent = this.absoluteVal = time;
        this.ontimeChanged();
    }

    setRelativeOntime(percentage) {
        if (this.relativeSelect.checked) {
            setSliderValue(null, percentage, this.slider);
        }
        percentage = Math.min(100, Math.max(0, percentage));
        this.relative.textContent = this.relativeVal = percentage;
        midiServer.sendRelativeOntime(this.relativeVal);
        this.ontimeChanged();
    }

    updateOntimeLabels() {
        if (this.relativeSelect.checked) {
            this.relative.innerHTML = "<b>"+this.relativeVal+"</b>";
            this.absolute.innerHTML = this.absoluteVal.toFixed();
        } else {
            this.absolute.innerHTML = "<b>"+this.absoluteVal+"</b>";
            this.relative.innerHTML = this.relativeVal.toFixed();
        }
        this.total.innerHTML = this.totalVal.toFixed();
    }

    onRelativeOntimeSelect() {
        if (this.relativeSelect.checked) {
            this.slider.max = '100';
            this.slider.value = this.relativeVal.toFixed();
        } else {
            this.slider.max = commands.maxOntime.toFixed();
            this.slider.value = this.absoluteVal.toFixed();
        }
        this.updateOntimeLabels();
    }

    onSliderMoved(){
        if (ontime.relativeSelect.checked) {
            this.setRelativeOntime(parseInt(ontime.slider.value));
        } else {
            this.setAbsoluteOntime(parseInt(ontime.slider.value));
        }
    }

    ontimeChanged() {
        ontime.totalVal = Math.round(ontime.absoluteVal*ontime.relativeVal/100.);
        commands.setOntime(ontime.totalVal);
        this.updateOntimeLabels();
    }
}

export const ontime = new OntimeUI();

export function updateSliderAvailability() {
    const busMaybeActive = busActive || !busControllable;
    const offDisable = !(transientActive && busMaybeActive);
    for (let i = 1; i <= 3; ++i) {
        const slider = $(".w2ui-panel-content .scopeview #slider" + i)[0];
        slider.className = offDisable?"slider-gray":"slider";
    }
    const onDisable = !busMaybeActive;
    ontime.slider.className = onDisable?"slider-gray":"slider";
}

export function init() {
    ontime.slider =<HTMLInputElement> $(".w2ui-panel-content .scopeview #ontime #slider")[0];
    ontime.relativeSelect =<HTMLInputElement> $(".w2ui-panel-content .scopeview #ontime #relativeSelect")[0];
    ontime.total = $(".w2ui-panel-content .scopeview #ontime #total")[0];
    ontime.relative = $(".w2ui-panel-content .scopeview #ontime #relative")[0];
    ontime.absolute = $(".w2ui-panel-content .scopeview #ontime #absolute")[0];
    ontime.slider.addEventListener("input", ontime.onSliderMoved);
    ontime.relativeSelect.onclick = ontime.onRelativeOntimeSelect;
}

function setSliderValue(name, value, slider = undefined) {
    if (!slider) {
        slider = document.getElementById(name);
    }
    if (value<slider.min||value>slider.max) {
        terminal.io.println("Tried to set slider \""+slider.id+"\" out of range (To "+value+")!");
        value = Math.min(slider.max, Math.max(slider.min, value));
    }
    slider.value = value;
}

function slider1(){
    const slider = <HTMLInputElement>document.getElementById('slider1');
    const slider_disp = document.getElementById('slider1_disp');
    slider_disp.innerHTML = slider.value + ' Hz';
    const pwd = Math.floor(1/Number(slider.value)*1000000);
    commands.setOfftime(Number(pwd));
}

export function setBPS(bps){
    setSliderValue("slider1", bps);
    slider1();
}

function slider2(){
    const slider: HTMLInputElement = <HTMLInputElement>document.getElementById('slider2');
    const slider_disp = document.getElementById('slider2_disp');
    slider_disp.innerHTML = slider.value + ' ms';
    commands.setBurstOntime(Number(slider.value));
}

export function setBurstOntime(time){
    setSliderValue("slider2", time);
    slider2();
}

function slider3(){
    const slider = <HTMLInputElement>document.getElementById('slider3');
    const slider_disp = document.getElementById('slider3_disp');
    slider_disp.innerHTML = slider.value + ' ms';
    commands.setBurstOfftime(Number(slider.value))
}

export function setBurstOfftime(time){
    setSliderValue("slider3", time);
    slider3();
}