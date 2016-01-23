import { EventEmitter } from 'events';
import calendarManager from './calendarManager';
import EventBox from './EventBox';

class Calendar extends EventEmitter {
	constructor(date) {
		super();
		this.elem = $('<div class="Calendar">');

		// const
		Calendar.ROW_HEIGHT = 25;
		Calendar.INTERVAL = 15; // minutes
		Calendar.DESCRIPTION_DEFAULT = 'New event (tap to edit)';

		// props
		this.rows = (24 * 60) / Calendar.INTERVAL; // 15 min per 24 hr
		this.selectedDate = date || new Date();
		this.formattedDate = '';
		this.eventsByDate = {}; // { yyyy-MM-dd: [event ids] }

		// init
		this.init();
	}

	init() {
		var self = this;

		this.on('touched', touchedDate => {
			calendarManager.addEvent(touchedDate, new Date(touchedDate.getTime() + 1000 * 60 * 60), Calendar.DESCRIPTION_DEFAULT); // + 1hr
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
			for (var i = 0; i < self.eventsByDate[dateFromStr].length; i++) {
				if (self.eventsByDate[dateFromStr][i] === id) {
					self.eventsByDate[dateFromStr].splice(i, 1);
					break;
				}
			}

			// refresh the view only if a date was removed from today
			if (dateFromStr === self.formattedDate) {
				self.refreshDate();
			}
		});

		calendarManager.on('updateEvent', id => {
			var updatedEvent = calendarManager.eventsData[id];
			var dateFromStr = Calendar.formatDate(updatedEvent.dateFrom);
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
			var minutes = Calendar.INTERVAL * i;

			var rowDate = new Date(date);
			rowDate.setMinutes(minutes);

			// init row if doesn't exist
			var curRow = this.elem.find(`#minute${minutes}`);
			if (!curRow.length) {
				curRow = $(`<div id="minute${minutes}" class="calRow"></div>`);
				curRow.css('height', `${Calendar.ROW_HEIGHT}px`);
				this.elem.append(curRow);
				curRow.bind('touch click', e => {
					this.touched.call(this, e);
				});

				var timeStr = Calendar.formatTime(rowDate);
				curRow.append(`<div class="timeLabel">${timeStr}</div>`);
			}

			curRow.attr('data-date', rowDate);
			curRow.toggleClass('hourRow', (minutes % 60) === 0);
		}

		this.refreshDate();
	}

	refreshDate() {
		var i, j, k, eventId;

		// check for new event data
		var eventIds = this.eventsByDate[this.formattedDate] || [];
		for (i = 0; i < eventIds.length; i += 1) {
			eventId = eventIds[i];
			if (!this.elem.find(`#${eventId}`).length) {
				var newEvent = calendarManager.eventsData[eventId];
				this.addEventBox(newEvent);
			}
		}

		// update event boxes
		var eventBoxes = this.elem.find('.EventBox');
		for (i = 0; i < eventBoxes.length; i += 1) {
			eventId = Number(eventBoxes[i].id);
			$(eventBoxes[i]).attr('data-sized', '');
			// remove event boxes that don't belong to today
			if (eventIds.indexOf(eventId) === -1) {
				$(`#${eventId}`).remove();
				continue;
			}

			// store collision nodes
			calendarManager.setNodes(eventId, this.getCollisions(eventId));
		}

		// reassess collisions between event boxes
		var timeLabelWidth = this.elem.find('#minute0 .timeLabel').width();
		eventIds.sort();
		for (i = 0; i < eventIds.length; i += 1) {
			eventId = eventIds[i];
			let collisionTree = this.getCollisionTree(eventId); // tree for this root event
			let longestCollisionBranch = [];
			for (j = 0; j < collisionTree.length; j += 1) {
				let collisionBranch = collisionTree[j];
				if (collisionBranch.length > longestCollisionBranch.length) {
					longestCollisionBranch = collisionBranch;
				}
			}

			for (k = 0; k < longestCollisionBranch.length; k += 1) {
				let collisionId = longestCollisionBranch[k];

				// adjust box width based on the longest chain of collisions
				// note: possible to collide with 10 boxes, but other 9 don't collide with each other, so
				// width is half screen
				let eventBoxElem = this.elem.find(`#${collisionId}`);

				// skip if already data-sized
				if ($(eventBoxElem).attr('data-sized')) {
					continue;
				}

				let boxWidthPerc = 95 / (longestCollisionBranch.length);
				eventBoxElem.css({
					'width': `${boxWidthPerc}%`
				});

				$(eventBoxElem).attr('data-sized', 'true');

				// adjust box position, in order it was created
				longestCollisionBranch = longestCollisionBranch.sort();
				k = longestCollisionBranch.indexOf(collisionId);
				eventBoxElem = this.elem.find(`#${collisionId}`);

				let boxLeft = timeLabelWidth + (eventBoxElem.width() * k);

				eventBoxElem.css({
					'transform': `translateX(${boxLeft}px)`
				});
			}
		}
	}

	touched(e) {
		var curRow = $(e.target);
		this.emit('touched', new Date(curRow.attr('data-date')));
	}

	addEventBox(eventData) {
		// create box with raw event data, place on physical calendar
		var totalMinutes = eventData.dateFrom.getMinutes() + eventData.dateFrom.getHours() * 60;
		var fromCalRow = this.elem.find(`#minute${totalMinutes}`);
		var fromCalRowRectTop = fromCalRow[0].offsetTop;

		totalMinutes = eventData.dateTo.getMinutes() + eventData.dateTo.getHours() * 60;
		var toCalRow = this.elem.find(`#minute${totalMinutes}`);
		var toCalRowRectTop = toCalRow.offset().top;

		// find or append, compute dimensions, position
		var eventBox = new EventBox({
			data: eventData
		});

		eventBox.on('updateEvent', eventData => {
			// update data model and refresh the event boxes
			calendarManager.updateEvent(eventData.id, eventData);
		});
		eventBox.on('deleteEvent', id => {
			// update data model and refresh the event boxes
			calendarManager.removeEvent(id);
		});

		var eventBoxElem = eventBox.elem;
		eventBoxElem.css({
			'height': `${toCalRowRectTop - fromCalRowRectTop}px`,
			'margin-top': `${fromCalRowRectTop + 1}px` // don't overwrite transform
		});
		this.elem.append(eventBoxElem);

		// DEBUG tapping an event duplicates it
		/*setTimeout(() => {
			eventBoxElem.bind('touch click', () => {
				calendarManager.addEvent(eventData.dateFrom, eventData.dateTo);
			});
		}, 250);*/
	}

	getCollisions(eventId) {
		let event1Id = eventId;

		// return all event ids this event collides with who are newer than itself (like linked nodes)
		var eventIds = this.eventsByDate[this.formattedDate] || [];
		let collisionIds = [];
		for (var j = 0; j < eventIds.length; j += 1) {
			let event2Id = eventIds[j];
			if (event1Id === event2Id) {
				continue;
			}

			// check if this event overlap from and to dates of other event
			if (Calendar.getOverlapY(event1Id, event2Id) && event2Id > event1Id) {
				collisionIds.push(event2Id);
			}
		}

		return collisionIds;
	}

	getCollisionTree(eventId) {
		// find total, greatest depth of branches
		var branches = []; // 2d array (collision tree)

		function buildBranch(nodeId, n) {
			branches[n] = [ nodeId ];
			let nodes = calendarManager.eventsData[nodeId].nodes;
			if (!nodes || !nodes.length) {
				return;
			}

			for (var i = 0; i < nodes.length; i += 1) {
				let child = calendarManager.eventsData[nodes[i]];
				branches[n].push(child.id);
				if (child.nodes.length) {
					buildBranch(child.id, n + 1);
				}
			}
		}

		buildBranch(eventId, 0);

		console.log('>>>>> collision tree', branches);

		return branches;
	}

	static formatDate(date) {
		// outputs a date string as yyyy-MM-dd
		let day = ('0' + date.getDate()).slice(-2);
		let month = ('0' + (date.getMonth() + 1)).slice(-2);
		let year = date.getFullYear();
		let dateStr = `${year}-${month}-${day}`;

		return dateStr;
	}

	static getOverlapY(eventId1, eventId2) {
		// return an overlap if two events overlap
		let event1 = calendarManager.eventsData[eventId1];
		let event2 = calendarManager.eventsData[eventId2];

		let event1From = event1.dateFrom.getTime(); // eventData
		let event2From = event2.dateFrom.getTime(); // comparedDate
		let event1To = event1.dateTo.getTime();
		let event2To = event2.dateTo.getTime();

		// essentially overlapping rect check but with dates (use rects?)
		let overlapY = Math.min(event1To, event2To) - Math.max(event1From, event2From);
		overlapY = Math.max(overlapY, 0);

		return overlapY;
	}

	static getOverlapX(eventId1, eventId2) {
		let r1 = document.getElementById(eventId1).getBoundingClientRect();
		let r2 = document.getElementById(eventId2).getBoundingClientRect();
		let overlapX = Math.abs(Math.max(r1.left, r2.left) - Math.min(r1.left + r1.width, r2.left + r2.width));
		overlapX = Math.max(overlapX, 0);

		return overlapX;
	}

	static formatTime(date) {
		var hoursStr = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
		var minutesStr = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();

		var timeStr = `${hoursStr}:${minutesStr}`;

		return timeStr;
	}
}

export default Calendar;
