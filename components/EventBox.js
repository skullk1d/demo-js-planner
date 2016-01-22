import { EventEmitter } from 'events';
import Calendar from './Calendar';

class EventBox extends EventEmitter {
	constructor(params) {
		super();
		params = params || {};

		// props
		this.data = params.data;
		this.id = this.data.id;
		this.nodes = []; // linked dates

		// const

		// init
		this.elem = $(`<div id=${this.id} class="EventBox"></div>`); // note: animations may cause async problems

		this.init();
	}

	init() {
		// build
		this.timeHeader = $(`<div class="timeHeader">x</div>`).appendTo(this.elem);

		this.handleBars = [
			$(`<div class="handleBar up">=</div>`).appendTo(this.elem),
			$(`<div class="handleBar down">&#8661;</div>`).appendTo(this.elem)
		];
		this.deleteButton = $(`<div class="deleteButton">x</div>`).appendTo(this.elem);

		this.descriptionLabel = $(`<div class="descriptionLabel"></div>`).appendTo(this.elem);
		this.descriptionInput = $(`<textarea class="descriptionInput"></textarea>`).appendTo(this.elem);

		this.cancelButton = $(`<div class="cancelButton">Cancel</div>`).appendTo(this.elem);
		this.confirmButton = $(`<div class="confirmButton">Save</div>`).appendTo(this.elem);

		this.setupEvents();
		this.refreshContent();
	}

	setupEvents() {
		var self = this;

		this.elem.bind('touch click', e => {
			e.stopPropagation();
		});

		// handles (move, date span)
		for (var i = 0; i < this.handleBars.length; i += 1) {
			let handleBar = this.handleBars[i];

			handleBar.bind('touchstart mousedown', e => {
				e.preventDefault();

				var lastHeight = this.elem.height();
				var lastOffset = this.elem.offset().top;

				// show it's active
				handleBar.addClass('active');

				// adjust end time by dragging
				handleBar.bind('touchmove mousemove', e => {
					e.preventDefault();

					// need original event for touch events
					let touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0] ||
						e.originalEvent.changedTouches && e.originalEvent.changedTouches[0] ||
						e.originalEvent || e;

					setTimeout(() => {
						if (handleBar.hasClass('down')) { // add to dateTo
							let newHeight = Math.round(Math.max(touch.pageY - self.elem.offset().top, Calendar.ROW_HEIGHT * 2));
							self.elem.height(newHeight - (newHeight % Calendar.ROW_HEIGHT) + Calendar.ROW_HEIGHT);
						} else if (handleBar.hasClass('up')) { // add to dateFrom
							let newOffset = Math.round(Math.max(touch.pageY, 0));
							self.elem.offset({ top: newOffset - (newOffset % Calendar.ROW_HEIGHT) });
						}
					}, 100);
				});

				// confirm update
				handleBar.one('touchend mouseup', e => {
					e.preventDefault();
					handleBar.removeClass('active');
					handleBar.unbind('touchmove');
					handleBar.unbind('mousemove'); // need to call separately

					// update event and emit date change
					var addedMinutes;

					// up or down?
					if (handleBar.hasClass('down')) { // add to dateTo
						let dHeight = self.elem.height() - lastHeight;
						addedMinutes = (dHeight / Calendar.ROW_HEIGHT) * Calendar.INTERVAL;
						self.data.dateTo.setMinutes(self.data.dateTo.getMinutes() + addedMinutes);
					} else if (handleBar.hasClass('up')) { // add to both
						let dOffset = self.elem.offset().top - lastOffset;
						addedMinutes = (dOffset / Calendar.ROW_HEIGHT) * Calendar.INTERVAL;
						self.data.dateFrom.setMinutes(self.data.dateFrom.getMinutes() + addedMinutes);
						self.data.dateTo.setMinutes(self.data.dateTo.getMinutes() + addedMinutes);
					}

					self.emit('updateEvent', self.data);
				});
			});
		}

		this.deleteButton.bind('touch click', e => {
			e.stopPropagation();
			self.emit('deleteEvent', self.id);
		});

		this.descriptionLabel.bind('touch click', e => {
			e.stopPropagation();
			self.descriptionInput.val(self.data.description);
			self.elem.addClass('editing');
			self.descriptionInput.outerHeight(self.elem.height() - self.handleBars[0].height());
			self.descriptionInput.focus();
			self.descriptionInput.select();
		});

		this.confirmButton.bind('touch click', e => {
			e.stopPropagation();
			self.elem.removeClass('editing');
			self.data.description = self.descriptionInput.val();
			self.refreshContent();
		});
		this.cancelButton.bind('touch click', e => {
			e.stopPropagation();
			self.elem.removeClass('editing');
			self.descriptionInput.val(self.data.description);
		});

		this.on('updateEvent', data => {
			self.refreshContent();
		});
	}

	setNodes(ids) {
		// add event ids that we're connected to via a collision
		this.nodes.push(ids);
	}

	refreshContent() {
		let data = this.data;
		var timeStrFrom = Calendar.formatTime(data.dateFrom);
		var timeStrTo = Calendar.formatTime(data.dateTo);
		this.timeHeader.html(`${timeStrFrom} to ${timeStrTo}`);
		this.descriptionLabel.html(data.description);
	}
}

export default EventBox;