import { EventEmitter } from 'events';
import Calendar from './Calendar';

const MS_ONE_DAY = 1000 * 60 * 60 * 24;

class MenuBar extends EventEmitter {
	constructor(date) {
		super();
		this.elem = $('<div class="MenuBar">');

		// props
		this.selectedDate = date || new Date();

		// ui
		this.datePicker = $(`<input class="datePicker" type="date" value="${Calendar.formatDate(this.selectedDate)}" />`);
		this.prevButton = $(`<input class="prevButton" type="button" value="Prev Day" />`);
		this.nextButton = $(`<input class="nextButton" type="button" value="Next Day" />`);

		// init
		this.initButtons();
		this.selectDate(this.selectedDate);

		/*return elem;*/
	}

	initButtons() {
		this.elem.append(this.prevButton);
		this.elem.append(this.datePicker);
		this.elem.append(this.nextButton);

		// setup events
		this.datePicker.change(e => { this.selectDate(new Date(e.target.value)); });

		this.prevButton.bind('click', e => {
			this.selectDate(new Date(this.selectedDate.getTime() - MS_ONE_DAY));
		});
		this.nextButton.bind('click', e => {
			this.selectDate(new Date(this.selectedDate.getTime() + MS_ONE_DAY));
		});

	}

	selectDate(date) {
		// date (yyyy-MM-dd)
		date.setHours(0);
		date.setMinutes(0);
		date.setSeconds(0);
		this.selectedDate = date;

		this.datePicker.val(Calendar.formatDate(date));

		this.emit('selectDate', date);
	}
}

export default MenuBar;
