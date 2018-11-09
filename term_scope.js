class scope {
	constructor(tt, wavecan, backcan) {
		this.grid=50;
		this.meas_space = 20;
		this.meas_position = 4;
		this.info_space = 150;
		this.control_space = 15;
		this.top_space = 20;
		this.trigger_space = 10;
		this.plot.xpos = this.trigger_space+1;
		this.plot.ypos = [];
		this.tt = tt;
		this.wavecanvas = document.getElementById(wavecan);
		this.wavecanvas.onmousedown = this.wave_mouse_down;
		this.backcanvas = document.getElementById(backcan);
		this.ctx = this.wavecanvas.getContext('2d');
		this.ctxb = this.backcanvas.getContext('2d');
	}
	resize(){
		this.plot.xpos = this.trigger_space+1;
		this.wavecanvas.style.width=(90-this.control_space)+'%';
		this.wavecanvas.style.height='100%';
		this.wavecanvas.width  = this.wavecanvas.offsetWidth;
		this.wavecanvas.height = this.wavecanvas.offsetHeight;
		this.backcanvas.style.width=(90-this.control_space)+'%';
		this.backcanvas.style.height='100%';
		this.backcanvas.width  = this.wavecanvas.offsetWidth;
		this.backcanvas.height = this.wavecanvas.offsetHeight;
		//HiDPI display support
		if(window.devicePixelRatio){
			pixel = window.devicePixelRatio;
			var height = this.wavecanvas.getAttribute('height');
			var width = this.wavecanvas.getAttribute('width');
			// reset the canvas width and height with window.devicePixelRatio applied
			this.wavecanvas.setAttribute('width', Math.round(width * window.devicePixelRatio));
			this.wavecanvas.setAttribute('height', Math.round( height * window.devicePixelRatio));
			this.backcanvas.setAttribute('width', Math.round(width * window.devicePixelRatio));
			this.backcanvas.setAttribute('height', Math.round( height * window.devicePixelRatio));
			// force the canvas back to the original size using css
			this.wavecanvas.style.width = width+"px";
			this.wavecanvas.style.height = height+"px";
			this.backcanvas.style.width = width+"px";
			this.backcanvas.style.height = height+"px";
		}
		if(draw_mode!=1){
			this.draw_grid();
			this.redrawTrigger();
			this.redrawMeas();
		}
	}
	
	redrawTrigger(){
		var x_res = this.wavecanvas.width;
		var y_res = this.wavecanvas.height-this.meas_space-this.top_space;
		var ytrgpos = Math.floor((this.tt.trigger_lvl*-1+1)*(y_res/2.0))+this.top_space;
		this.ctx.clearRect(0, 0, 10, this.wavecanvas.height);
		if(this.tt.trigger!=-1){
			this.tt.trigger_block=1;
			this.ctx.beginPath();
			this.ctx.lineWidth = pixel;
			this.ctx.strokeStyle = wavecolor[this.tt.trigger];
			this.ctx.moveTo(0, ytrgpos);
			this.ctx.lineTo(10, ytrgpos);
			this.ctx.moveTo(10, ytrgpos);
			if(this.tt.trigger_lvl>0){
				this.ctx.lineTo(5, ytrgpos-2);
			}else{
				this.ctx.lineTo(5, ytrgpos+2);
			}
			this.ctx.stroke();
			this.ctx.font = "12px Arial";
			this.ctx.textAlign = "center";
			this.ctx.fillStyle = wavecolor[this.tt.trigger];
			if(ytrgpos < 14){
				this.ctx.fillText(this.tt.trigger,4,ytrgpos+12);
			}else{
				this.ctx.fillText(this.tt.trigger,4,ytrgpos-4);
			}
		}
	}
	
	draw_grid(){
		
		var x_res = this.wavecanvas.width-this.info_space;
		var y_res = this.wavecanvas.height-this.meas_space-this.top_space;

		this.ctxb.beginPath();
		this.ctxb.strokeStyle= "yellow";
		this.ctxb.lineWidth = pixel;

		this.ctxb.moveTo(this.trigger_space, Math.floor(y_res/2)+this.top_space);
		this.ctxb.lineTo(x_res, Math.floor(y_res/2)+this.top_space);

		this.ctxb.stroke();

		this.ctxb.beginPath();
		this.ctxb.lineWidth = pixel;
		this.ctxb.strokeStyle= "yellow";
		this.ctxb.moveTo(this.trigger_space+1, this.top_space);
		this.ctxb.lineTo(this.trigger_space+1, y_res+this.top_space);
		this.ctxb.stroke();
		this.ctxb.beginPath();
		this.ctxb.lineWidth = pixel;
		this.ctxb.strokeStyle= "grey";
		for(var i = this.trigger_space+this.grid; i < x_res; i=i+this.grid){
			this.ctxb.moveTo(i, this.top_space);
			this.ctxb.lineTo(i, y_res+this.top_space);
		}

		for(i = (y_res/2)+(y_res/10); i < y_res; i=i+(y_res/10)){
			this.ctxb.moveTo(this.trigger_space, i+this.top_space);
			this.ctxb.lineTo(x_res, i+this.top_space);
			this.ctxb.moveTo(this.trigger_space, y_res -i+this.top_space);
			this.ctxb.lineTo(x_res, y_res -i+this.top_space);
		}

	   this.ctxb.stroke();	
	}
	
	redrawInfo(){
		var x_res = this.wavecanvas.width;
		var y_res = this.wavecanvas.height;
		var line_height = 32;
		var trigger_symbol = "";
		this.ctx.clearRect(x_res - this.info_space, 0, x_res, y_res - this.meas_space);
		this.ctx.font = "12px Arial";
		this.ctx.textAlign = "left";
		var tterm_length = this.tt.length;
		for (var i = 0; i < tterm_length; i++){
			if (tterm[i].name){
				this.ctx.fillStyle = wavecolor[i];
				if(i == this.tt.trigger){
					trigger_symbol = "->";
				}
			this.ctx.fillText(trigger_symbol + "w" + i + ": " + tterm[i].name,x_res - this.info_space + 4, line_height * (i+1));
			this.ctx.fillText(tterm[i].count_div +' '+ tterm[i].unit +'/div',x_res - this.info_space + 4, (line_height * (i+1))+16);
			trigger_symbol = "";
			}
		}
	}
	
	redrawMeas(){
		var x_res = this.wavecanvas.width;
		var y_res = this.wavecanvas.height;
		this.ctx.clearRect(this.trigger_space, y_res - this.meas_space, x_res - this.info_space, y_res);

		this.ctx.font = "12px Arial";
		this.ctx.textAlign = "left";
		this.ctx.fillStyle = "white";
		if(this.tt.trigger!=-1){
		this.ctx.fillText("Trg lvl: " + this.tt.trigger_lvl ,this.trigger_space, y_res - this.meas_position);
		var state='';
		if(this.tt.trigger_trgt){
			state='Trg...'
		}else{
			state='Wait...'
		}
			this.ctx.fillText("Trg state: " +state ,this.trigger_space+100, y_res - this.meas_position);
		}else{
			this.ctx.fillText("Trg lvl: off" ,this.trigger_space, y_res - this.meas_position);
		}
		var text_pos = this.trigger_space+180;
		for(var i=0;i<NUM_GAUGES;i++){
			if (tterm[i].name){
				this.ctx.fillStyle = wavecolor[i];
				this.ctx.fillText("Min: " +meas[i].min ,text_pos+=60, y_res - this.meas_position);
				this.ctx.fillText("Max: " +meas[i].max ,text_pos+=60, y_res - this.meas_position);
				this.ctx.fillText("Avg: "+meas[i].avg ,text_pos+=60, y_res - this.meas_position);
			}
		}
	}
	
	redrawTop(){
		var x_res = this.wavecanvas.width;
		var y_res = this.wavecanvas.height;
		this.ctx.clearRect(this.trigger_space, 0, x_res - this.info_space, this.top_space);

		this.ctx.font = "12px Arial";
		this.ctx.textAlign = "left";
		this.ctx.fillStyle = "white";

		this.ctx.fillText("MIDI-File: " + midi_state.file + ' State: ' + midi_state.state + ' ' + midi_state.progress + '% / 100%'  ,this.trigger_space, 12);

	}
	
	plot(){

	   var x_res = this.wavecanvas.width-this.info_space;
	   var y_res = this.wavecanvas.height-this.meas_space-this.top_space;

		

		this.ctx.clearRect(this.plot.xpos, this.top_space, pixel, y_res);

		for(var i = 0;i<this.tt.length;i++){
			//Meas
			if(tterm[i].value_real < meas_backbuffer[i].min) meas_backbuffer[i].min = tterm[i].value_real;
			if(tterm[i].value_real > meas_backbuffer[i].max) meas_backbuffer[i].max = tterm[i].value_real;
			meas_backbuffer[i].avg_sum += (tterm[i].value_real*tterm[i].value_real);
			meas_backbuffer[i].avg_samp++;
			//Meas
			
			
			var ypos = (tterm[i].value*-1+1)*(y_res/2.0);
			if(this.plot.ypos[i] && (this.plot.ypos[i] != (y_res/2.0) || tterm[i].value)){
				this.ctx.beginPath();
				this.ctx.lineWidth = pixel;
				this.ctx.strokeStyle = wavecolor[i];
				this.ctx.moveTo(this.plot.xpos,this.plot.ypos[i]+this.top_space);
				this.ctx.lineTo(this.plot.xpos+pixel,ypos+this.top_space);
				this.ctx.stroke();
			}
			this.plot.ypos[i] = ypos;//save previous position
		}

		this.plot.xpos+=pixel;
		if(this.plot.xpos>=x_res){
			this.calc_meas();
			this.tt.trigger_trgt=0;
			this.tt.trigger_block=0;
			this.redrawMeas();
			this.plot.xpos = this.TRIGGER_SPACE+1;
			
		}
	}
	
	chart_cls(){
		this.ctxb.clearRect(0, 0, this.backcanvas.width, this.backcanvas.height);
		this.ctx.clearRect(0, 0, this.backcanvas.width, this.backcanvas.height);	
	}	
	
	wave_mouse_down(e){
		var pos_y = e.y - 51;
		var y_res = this.wavecanvas.height-this.meas_space-this.top_space;
		if((pos_y>=this.top_space && pos_y<=this.wavecanvas.height-this.meas_space) && this.tt.trigger!=-1){
			pos_y-=this.top_space;
			this.tt.trigger_lvl=((2/y_res)*((y_res/2)-pos_y)).toFixed(2);
			this.tt.trigger_lvl_real=this.tt.trigger_lvl*this.tt[tterm.trigger].span;
			console.log(this.tt.trigger_lvl_real);
			this.redrawMeas();
			this.redrawTrigger();
		}
	}

	calc_meas(){
		for(var i = 0;i<meas_backbuffer.length;i++){
			meas[i].min = meas_backbuffer[i].min.toFixed(2);
			meas[i].max = meas_backbuffer[i].max.toFixed(2);
			meas[i].avg = Math.sqrt(meas_backbuffer[i].avg_sum / meas_backbuffer[i].avg_samp).toFixed(2);
		}
	}
	
}
