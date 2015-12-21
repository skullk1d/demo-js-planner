import Calendar from './components/Calendar';
import MenuBar from './components/MenuBar';

// main
$(document).ready(function () {
	var app = $('#app');

	// init ui
	var menuBar = new MenuBar();
	var calendar = new Calendar(menuBar.selectedDate);

	app.append(menuBar.elem);
	app.append(calendar.elem);

	// events
	menuBar.on('selectDate', date => {
		calendar.displayDate(date);
	});
});
