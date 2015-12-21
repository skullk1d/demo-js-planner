import { EventEmitter } from 'events';
import calendarManager from './calendarManager';

class Calendar extends EventEmitter {
	constructor(date) {
		super();
		this.elem = $('<div class="Calendar">');

		// props
		this.interval = 15; // minutes
		this.rows = (24 * 60) / this.interval; // 15 min per 24 hr
		this.selectedDate = date || new Date();
		this.formattedDate = '';
		this.eventsByDate = {}; // { yyyy-MM-dd: [event ids] }

		// const
		Calendar.ROW_HEIGHT = 25;

		// init
		this.init();
	}

	init() {
		var self = this;

		this.on('touched', touchedDate => {
			calendarManager.addEvent(touchedDate, new Date(touchedDate.getTime() + 1000 * 60 * 60)); // + 1hr
		});

		calendarManager.on('addEvent', id => {
			// synchoronous but ready for async api
			var addedEvent = calendarManager.eventsData[id];
			var dateFromStr = Calendar.formatDate(addedEvent.dateFrom);
			self.eventsByDate[dateFromStr] = self.eventsByDate[dateFromStr] || [];
			self.eventsByDate[dateFromStr].push(id);

			if (dateFromStr === self.formattedDate) {
				self.refreshDate();
			}
		});

		calendarManager.on('removeEvent', (id, dateFrom) => {
			var dateFromStr = Calendar.formatDate(dateFrom);
			for (var i = 0; i < self.eventsByDate[dateFrom].length; i++) {
				if (self.eventsByDate[dateFrom][i] === id) {
					self.eventsByDate[dateFrom].splice(i, 1);
					break;
				}
			}

			if (dateFromStr === self.formattedDate) {
				self.refreshDate();
			}
		});

		this.displayDate(this.selectedDate);
	}

	displayDate(date) {
		this.elem.attr('data-date', Calendar.formatDate(date)); // yyy-MM-dd
		this.selectedDate = date;
		this.formattedDate = Calendar.formatDate(date);

		// update all rows to contain time for this day, as well as clearing and showing events
		// rows organized by total minutes in day, current date stored as data attr
		for (var i = 0; i < this.rows; i += 1) {
			var minutes = this.interval * i;

			var rowDate = new Date(date);
			rowDate.setMinutes(minutes);

			// init row if doesn't exist
			var curRow = this.elem.find(`#minute${minutes}`);
			if (!curRow.length) {
				curRow = $(`<div id="minute${minutes}" class="calRow"></div>`);
				curRow.css('height', `${Calendar.ROW_HEIGHT}px`);
				this.elem.append(curRow);
				curRow.on('touchend', e => {
					this.touched.call(this, e);
				});
				curRow.on('click', e => {
					this.touched.call(this, e);
				});

				var hoursStr = rowDate.getHours() < 10 ? '0' + rowDate.getHours() : rowDate.getHours();
				var minutesStr = rowDate.getMinutes() < 10 ? '0' + rowDate.getMinutes() : rowDate.getMinutes();
				curRow.append(`<div class="timeLabel">${hoursStr}:${minutesStr}</div>`);
			}

			curRow.attr('data-date', rowDate);
			curRow.toggleClass('hourRow', (minutes % 60) === 0);
		}

		this.refreshDate();
	}

	refreshDate() {
		var i, eventId;

		// check for new event data
		var eventIds = this.eventsByDate[this.formattedDate] || [];
		for (i = 0; i < eventIds.length; i += 1) {
			eventId = eventIds[i];
			if (!this.elem.find(`#${eventId}`).length) {
				var newEvent = calendarManager.eventsData[eventId];
				this.addEventBox(newEvent);
			}
		}

		// remove event boxes that don't belong to today
		var eventBoxes = this.elem.find('.eventBox');
		for (i = 0; i < eventBoxes.length; i += 1) {
			eventId = Number(eventBoxes[i].id);
			if (eventIds.indexOf(eventId) === -1) {
				$(`#${eventId}`).remove();
			}
		}
	}

	touched(e) {
		var curRow = $(e.target);
		this.emit('touched', new Date(curRow.attr('data-date')));
	}

	addEventBox(eventData) {
		// check if this event overlap from and to dates of other events
		var eventIds = this.eventsByDate[this.formattedDate];

		var numOverlaps = 0;
		var collisionIds = [];
		var i, eventId;
		for (i = 0; i < eventIds.length; i += 1) {
			eventId = eventIds[i];
			if (eventData.id === eventId) {
				continue;
			}

			let compareData = calendarManager.eventsData[eventId];

			let eventFrom = eventData.dateFrom.getTime(); // eventData
			let compareFrom = compareData.dateFrom.getTime(); // comparedDate
			let eventTo = eventData.dateTo.getTime();
			let compareTo = compareData.dateTo.getTime();

			// essentially overlapping rect check
			let overlapY = Math.min(eventTo, compareTo) - Math.max(eventFrom, compareFrom);

			if (overlapY > 0) {
				numOverlaps += 1;
				collisionIds.push(eventId);
			}
		}

		// create box with raw event data, place on physical calendar
		var totalMinutes = eventData.dateFrom.getMinutes() + eventData.dateFrom.getHours() * 60;
		var fromCalRow = this.elem.find(`#minute${totalMinutes}`);
		var fromCalRowRectTop = fromCalRow[0].offsetTop;

		totalMinutes = eventData.dateTo.getMinutes() + eventData.dateTo.getHours() * 60;
		var toCalRow = this.elem.find(`#minute${totalMinutes}`);
		var toCalRowRectTop = toCalRow[0].offsetTop;

		// append, compute dimensions, position
		var eventBox = $(`<div id=${eventData.id} class="eventBox"></div>`);
		var boxWidthPerc = 95 / (1 + numOverlaps);

		eventBox.css({
			'width': `${boxWidthPerc}%`,
			'height': `${toCalRowRectTop - fromCalRowRectTop}px`,
			'margin-top': `${fromCalRowRectTop}px` // don't overwrite transform
		});

		this.elem.append(eventBox);

		// TODO: create class for EventBox
		// for now, tapping an event duplicates it
		eventBox.bind('touch click', e => {
			calendarManager.addEvent(eventData.dateFrom, eventData.dateTo);
		});

		// adjust boxes we collided with, otherwise finish positioning current box and exit
		if (!numOverlaps) {
			eventBox.css({
				'transform': `translateX(${fromCalRow.find('.timeLabel').width()}px)`
			});

			return;
		}

		collisionIds.push(eventData.id); // include current event
		collisionIds = collisionIds.sort();
		for (i = 0; i < collisionIds.length; i += 1) {
			eventId = collisionIds[i];
			eventBox = this.elem.find(`#${eventId}`);
			eventBox.width(`${boxWidthPerc}%`); // need this computed

			var boxLeft = fromCalRow.find('.timeLabel').width() + (eventBox.width() * i);

			eventBox.css({
				'transform': `translateX(${boxLeft}px)`
			});
		}
	}

	static formatDate(date) {
		// outputs a date string as yyyy-MM-dd
		var day = ('0' + date.getDate()).slice(-2);
		var month = ('0' + (date.getMonth() + 1)).slice(-2);
		var year = date.getFullYear();
		var dateStr = `${year}-${month}-${day}`;

		return dateStr;
	}
}

export default Calendar;
