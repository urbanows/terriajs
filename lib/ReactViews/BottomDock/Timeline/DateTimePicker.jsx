import React from 'react';
import createReactClass from 'create-react-class';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import uniq from 'lodash.uniq';
import defined from 'terriajs-cesium/Source/Core/defined';
import {formatDateTime} from './DateFormats';
import Icon from '../../Icon.jsx';
import ObserveModelMixin from '../../ObserveModelMixin';
import Styles from './timeline.scss';
import combine from'terriajs-cesium/Source/Core/combine';

function daysInMonth(month, year) {
  const n = new Date(year, month, 0).getDate();
  return Array.apply(null, {length: n}).map(Number.call, Number);
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DateTimePicker = createReactClass({
    displayName: 'DateTimePicker',
    mixins: [ObserveModelMixin],

    propTypes: {
        dates: PropTypes.array,         // Array of JS Date objects.
        currentDate: PropTypes.object,  // JS Date object - must be an element of props.dates, or null/undefined.
        onChange: PropTypes.func,
        openDirection: PropTypes.string,
    },

    getInitialState() {
        return {
          isOpen: false,
          century: null,
          year: null,
          month: null,
          day: null,
          time: null,
          granularity: null
        };
    },

    componentWillMount() {
      const datesObject = objectifyDates(this.props.dates);
      let defaultCentury = null;
      let defaultYear = null;
      let defaultMonth = null;
      let defaultDay = null;
      let defaultGranularity = 'century';

      if (Object.keys(datesObject).length === 1) {
        // only one century
        const soleCentury = Object.keys(datesObject)[0];
        const dataFromThisCentury = datesObject[soleCentury];
        defaultCentury = soleCentury;
        defaultGranularity = 'year';

        if (Object.keys(dataFromThisCentury).length === 1) {
          // only one year, check if this year has only one month
          const soleYear = Object.keys(dataFromThisCentury)[0];
          const dataFromThisYear = dataFromThisCentury[soleYear];
          defaultYear = soleYear;
          defaultGranularity = 'month';

          if (Object.keys(dataFromThisYear).length === 1) {
            // only one month data from this one year, need to check day then
            const soleMonth = Object.keys(dataFromThisYear)[0];
            const dataFromThisMonth = dataFromThisYear[soleMonth];
            defaultMonth = soleMonth;
            defaultGranularity = 'day';

            if (Object.keys(dataFromThisMonth).length === 1) {
              // only one day has data
              defaultDay = Object.keys(dataFromThisMonth)[0];
            }
          }
        }
      }
      this.setState({
        datesObject: datesObject,
        century: defaultCentury,
        year: defaultYear,
        month: defaultMonth,
        day: defaultDay,
        time: currentDate,
        granularity: defaultGranularity
      });
      const currentDate = this.props.currentDate;

      window.addEventListener('click', this.closePicker);
    },

    componentWillUnmount: function() {
      window.removeEventListener('click', this.closePicker);
    },

    closePicker() {
      this.setState({isOpen: false});
    },

    renderCenturyGrid(datesObject) {
      const centuries = Object.keys(datesObject);
      return (
        <div className={Styles.grid}>
          <div className={Styles.gridHeading}>Select a century</div>
          {centuries.map(c => <button key={c} className={Styles.centuryBtn} onClick={() => this.setState({century: c})}>{c}00</button>)}
        </div>
      );
    },

    renderYearGrid(datesObject) {
      if(!defined(datesObject.dates)) {
          const years = Object.keys(datesObject);
          const monthOfYear = Array.apply(null, {length: 12}).map(Number.call, Number);
          return (
            <div className={Styles.grid}>
              <div className={Styles.gridHeading}>Select a year</div>
              <div className={Styles.gridBody}>{years.map(y => <div className={Styles.gridRow} key={y} onClick={() => this.setState({year: y, month: null, day: null, time: null})}>
                <span className={Styles.gridLabel}>{y}</span>
                <span className={Styles.gridRowInner12}>{monthOfYear.map(m => <span className={datesObject[y][m] ? Styles.activeGrid : ''} key={m} ></span>)}</span></div>)}
              </div>
            </div>
          );
        } else {
          return this.renderList(datesObject.dates);
        }
      },

    renderMonthGrid(datesObject) {
      const year = this.state.year;
      return (
        <div className={Styles.grid}>
          <div className={Styles.gridHeading}>
            <button className={Styles.backbtn} onClick={()=>{this.setState({year: null, month: null, day: null, time: null});}}>{this.state.year}</button>
          </div>
          <div className={Styles.gridBody}>{monthNames.map((m, i) => <div className={classNames(Styles.gridRow, {[Styles.inactiveGridRow]: !defined(datesObject[year][i])})} key={m} onClick={() => defined(datesObject[year][i]) && this.setState({month: i, day: null, time: null})}>
            <span className={Styles.gridLabel}>{m}</span>
            <span className={Styles.gridRowInner31}>{daysInMonth(i + 1, year).map(d => <span className={ defined(datesObject[year][i]) && defined(datesObject[year][i][d + 1]) ? Styles.activeGrid : ''} key={d} ></span>)}</span></div>)}
          </div>
        </div>
      );
    },

    renderDayView(datesObject) {
      // Create one date object per day, using an arbitrary time. This does it via Object.keys and moment().
      const days = Object.keys(datesObject[this.state.year][this.state.month]);
      const daysToDisplay = days.map(d => moment().date(d).month(this.state.month).year(this.state.year));
      const selected = defined(this.state.day) ? moment().date(this.state.day).month(this.state.month).year(this.state.year) : null;
      // Aside: You might think this implementation is clearer - use the first date available on each day.
      // However it fails because react-datepicker actually requires a moment() object for selected, not a Date object.
      // const monthObject = this.props.datesObject[this.state.year][this.state.month];
      // const daysToDisplay = Object.keys(monthObject).map(dayNumber => monthObject[dayNumber][0]);
      // const selected = defined(this.state.day) ? this.props.datesObject[this.state.year][this.state.month][this.state.day][0] : null;

      return (
        <div className={Styles.dayPicker}>
          <div>
            <button className={Styles.backbtn} onClick={() => {this.setState({year: null, month: null, day: null, time: null}); }}>{this.state.year}</button>
            <button className={Styles.backbtn} onClick={() => {this.setState({month: null, day: null, time: null}); }}>{monthNames[this.state.month]}</button>
          </div>
            <DatePicker
                inline
                onChange={this.selectDay.bind(this, datesObject)}
                includeDates={daysToDisplay}
                selected={selected}
            />
        </div>
      );
    },

    renderList(items) {
      return <div className={Styles.grid}>
        <div className={Styles.gridHeading}>Select a time</div>
        <div className={Styles.gridBody}>{items.map(item => <button key={formatDateTime(item)} className={Styles.dateBtn} onClick={() => {this.setState({time: item, isOpen: false}); this.props.onChange(item);}}>{formatDateTime(item)}</button>)}</div>
      </div>;
    },

    selectDay(datesObject, value) {
      // Note value is a momentjs date, not a JS date - it has been returned by DatePicker in the onChange event.
      // Hence use value.date() here, but m.getUTCDate() when building the datesObject. I think...
      // See https://momentjs.com/docs/
      const selectedTime = datesObject[this.state.year][this.state.month][value.date()][0];
      this.setState({day: value.date(), time: selectedTime, isOpen: false});
      this.props.onChange(selectedTime);
    },

    renderHourView(datesObject) {
      const timeOptions = datesObject[this.state.year][this.state.month][this.state.day].map((m) => ({
        value: m,
        label: formatDateTime(m)
      }));

      return (
        <div className={Styles.hourview}>
          <select onChange={(event) => {this.setState({time: event.target.value, isOpen: false}); this.props.onChange(event.target.value); }} value={this.state.time ? this.state.time: ''}>
            {timeOptions.map(t => <option key={t.label} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      );
    },

    goBack() {
      if (defined(this.state.time)) {
        this.setState({
          month: null,
          time: null,
          day: null
        });
      } else if (defined(this.state.day)) {
        this.setState({
          month: null,
          time: null,
          day: null
        });
      } else if (defined(this.state.month)) {
        this.setState({
          month: null,
          time: null,
          day: null
        });
      } else if (defined(this.state.year)) {
        this.setState({
          year: null,
          month: null,
          time: null,
          day: null
        });
      } else if (defined(this.state.century)) {
        this.setState({
          century: null,
          year: null,
          month: null,
          time: null,
          day: null
        });
      }
    },

    toggleDatePicker() {
      if (!this.state.isOpen) {
        // When the date picker is opened, we should update the old state with the new currentDate, but to the same granularity.
        // The current date must be one of the available item.dates, or null/undefined.
        const currentDate = this.props.currentDate;
        if (defined(currentDate)) {
          const newState = {
            day: defined(this.state.day) ? currentDate.getUTCDate() : null,
            month: defined(this.state.month) ? currentDate.getUTCMonth() : null,
            year: defined(this.state.year) ? currentDate.getUTCFullYear() : null,
            century: defined(this.state.century) ? Math.floor(currentDate.getUTCFullYear() / 100) : null
          };
          this.setState(newState);
        }
      }
      this.setState({
        isOpen: !this.state.isOpen
      });
    },

    render() {
      if (this.props.dates) {
        const datesObject = this.state.datesObject;
        return (
            <div className={Styles.timelineDatePicker} onClick={(event) => { event.stopPropagation(); }}>
              <button className={Styles.togglebutton} onClick={() => { this.toggleDatePicker(); }}><Icon glyph={Icon.GLYPHS.calendar}/></button>
              {this.state.isOpen && <div className={classNames(Styles.datePicker,{[Styles.openBelow]: this.props.openDirection === 'down'})}>
              <button className={Styles.backbutton} disabled={!this.state[this.state.granularity]} type='button' onClick={() => this.goBack()}><Icon glyph={Icon.GLYPHS.left}/></button>
                {!defined(this.state.century) && this.renderCenturyGrid(datesObject)}
                {defined(this.state.century) && !defined(this.state.year) && this.renderYearGrid(datesObject[this.state.century])}
                {defined(this.state.year) && !defined(this.state.month) && this.renderMonthGrid(datesObject[this.state.century])}
                {(defined(this.state.year) && defined(this.state.month)) && this.renderDayView(datesObject[this.state.century])}
                {(defined(this.state.year) && defined(this.state.month) && defined(this.state.day)) && this.renderHourView(datesObject[this.state.century])}
              </div>}
            </div>
          );
      } else {
        return null;
      }
    }
});

function getOneYear(year, dates) {
  // All data from a given year.
  return dates.filter(d => d.getUTCFullYear() === year);
}

function getOneMonth(yearData, monthIndex) {
  // All data from certain month of that year.
  return yearData.filter(y => y.getUTCMonth() === monthIndex);
}

function getOneDay(monthData, dayIndex) {
  return monthData.filter(m => m.getUTCDate() === dayIndex);
}

function getMonthForYear(yearData) {
  // get available months for a given year
  return uniq(yearData.map(d => d.getUTCMonth()));
}

function getDaysForMonth(monthData) {
  // Get all available days given a month in a year.
  // Start from 1, so we need to change to 0 based.
  return uniq(monthData.map(m => m.getUTCDate()));
}

/**
 * Process an array of dates into layered objects of years, months and days.
 * @param  {Date[]} An array of dates.
 * @return {Object} Returns an object whose keys are years, whose values are objects whose keys are months (0=Jan),
 *   whose values are objects whose keys are days, whose values are arrays of all the datetimes on that day.
 */
function objectifyDates(dates) {
  const years = uniq(dates.map(date => date.getUTCFullYear()));
  const centuries = uniq(years.map(year => Math.floor(year / 100)));
  const result = centuries.reduce((accumulator, currentValue) => combine(accumulator, objectifyCenturyData(currentValue, dates, years)), {});
  return result;
}

function objectifyCenturyData(century, dates, years) {
  // century is a number like 18, 19 or 20.
  const yearsInThisCentury = years.filter(year => Math.floor(year / 100) === century);
  return {[century]: yearsInThisCentury.reduce((accumulator, currentValue) => combine(accumulator, objectifyYearData(currentValue, dates, years)), {})};
}

function objectifyYearData(year, dates) {
  const yearData = getOneYear(year, dates);
  if(yearData.length <= 12) {
    // no need to show month list, just display dates
    return {dates: yearData};
  }
  const monthInYear = {};
  getMonthForYear(yearData).forEach(monthIndex => {
    const monthData = getOneMonth(yearData, monthIndex);
    const daysInMonth = {};

    getDaysForMonth(monthData).forEach(dayIndex => {
      daysInMonth[dayIndex] = getOneDay(monthData, dayIndex);
    });
    monthInYear[monthIndex] = daysInMonth;
  });

  return {[year]: monthInYear};
}

module.exports = DateTimePicker;
