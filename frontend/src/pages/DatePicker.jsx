/**
 * DatePicker.jsx  — User-friendly calendar date picker
 *
 * • Renders a styled text input (DD/MM/YYYY)
 * • Click input → calendar popover appears
 * • Month/Year header with ‹ › navigation
 * • Today highlighted, selected day highlighted in red-800
 * • Keyboard-friendly: Tab closes picker, Escape closes picker
 * • Does NOT depend on any external date library (only native Date)
 * • max / min props accepted as "YYYY-MM-DD" strings (same as type="date")
 *
 * Props:
 *   value       {string}  "YYYY-MM-DD" or ""
 *   onChange    {fn}      called with "YYYY-MM-DD" string or ""
 *   max         {string}  "YYYY-MM-DD" (optional)
 *   min         {string}  "YYYY-MM-DD" (optional)
 *   placeholder {string}
 *   error       {bool}    when true renders red border
 *   disabled    {bool}
 *   id          {string}
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → Date at midnight local */
const parseYMD = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Date → "YYYY-MM-DD" */
const toYMD = (d) => {
  if (!d) return '';
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

/** Date → "DD/MM/YYYY" for display */
const toDisplay = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

/** "DD/MM/YYYY" user input → "YYYY-MM-DD" or null */
const fromDisplay = (s) => {
  const clean = s.replace(/\D/g, '');
  if (clean.length < 8) return null;
  const d = clean.slice(0, 2);
  const m = clean.slice(2, 4);
  const y = clean.slice(4, 8);
  if (Number(m) < 1 || Number(m) > 12) return null;
  if (Number(d) < 1 || Number(d) > 31) return null;
  if (Number(y) < 1900 || Number(y) > 2100) return null;
  return `${y}-${m}-${d}`;
};

/** Get all calendar days for a given year+month (including padding from prev/next month) */
const getCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells = [];
  // padding from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), outside: true });
  }
  // current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), outside: false });
  }
  // padding to fill 6 rows
  let next = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, next++), outside: true });
  }
  return cells;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DatePicker({
  value = '',
  onChange,
  max = '',
  min = '',
  placeholder = 'DD/MM/YYYY',
  error = false,
  disabled = false,
  id,
}) {
  const [open,        setOpen]        = useState(false);
  const [inputText,   setInputText]   = useState(toDisplay(value));
  const [viewYear,    setViewYear]    = useState(() => {
    const d = parseYMD(value) || new Date();
    return d.getFullYear();
  });
  const [viewMonth,   setViewMonth]   = useState(() => {
    const d = parseYMD(value) || new Date();
    return d.getMonth();
  });
  const [showYearSel, setShowYearSel] = useState(false);

  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  const maxDate = parseYMD(max);
  const minDate = parseYMD(min);

  // Sync display text when value prop changes externally
  useEffect(() => {
    setInputText(toDisplay(value));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const isDisabledDate = useCallback((date) => {
    if (maxDate && date > maxDate) return true;
    if (minDate && date < minDate) return true;
    return false;
  }, [maxDate, minDate]);

  const selectDate = (date) => {
    if (isDisabledDate(date)) return;
    const ymd = toYMD(date);
    onChange(ymd);
    setInputText(toDisplay(ymd));
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    // auto-insert slashes
    let digits = raw.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2)  formatted = digits.slice(0,2) + '/' + digits.slice(2);
    if (digits.length > 4)  formatted = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4,8);

    setInputText(formatted);

    if (digits.length === 8) {
      const ymd = fromDisplay(formatted);
      if (ymd) {
        const d = parseYMD(ymd);
        if (!isDisabledDate(d)) {
          onChange(ymd);
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      }
    } else if (digits.length === 0) {
      onChange('');
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputText('');
    onChange('');
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const today     = new Date(); today.setHours(0,0,0,0);
  const selected  = parseYMD(value);
  const cells     = getCalendarDays(viewYear, viewMonth);

  const borderCls = error
    ? 'border-red-400 focus-within:ring-red-200 focus-within:border-red-500'
    : 'border-gray-200 focus-within:ring-red-800/30 focus-within:border-red-800';

  // Year range for year selector
  const thisYear = new Date().getFullYear();
  const yearRange = Array.from({ length: 120 }, (_, i) => thisYear - i);

  return (
    <div ref={containerRef} className="relative">
      {/* ── Input row ── */}
      <div className={`flex items-center w-full border rounded-lg bg-white transition-colors focus-within:ring-2 ${borderCls} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => { if (!disabled) setOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
          autoComplete="off"
        />
        {value && !disabled && (
          <button type="button" onClick={handleClear} className="px-1.5 text-gray-300 hover:text-gray-500">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => { if (!disabled) { setOpen(o => !o); inputRef.current?.focus(); } }}
          className="px-2.5 text-gray-400 hover:text-red-800 transition-colors"
          tabIndex={-1}
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* ── Calendar popover ── */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl w-72 overflow-hidden"
          style={{ top: '100%', left: 0 }}
          onMouseDown={(e) => e.preventDefault()} // prevent input blur
        >
          {/* Month/Year header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-red-800">
            <button type="button" onClick={prevMonth}
              className="p-1 rounded text-red-200 hover:text-white hover:bg-red-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowYearSel(y => !y)}
              className="flex items-center gap-1 text-white font-semibold text-sm hover:text-red-200 transition-colors"
            >
              {MONTHS[viewMonth]} {viewYear}
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showYearSel ? 'rotate-90' : 'rotate-0'}`} />
            </button>

            <button type="button" onClick={nextMonth}
              className="p-1 rounded text-red-200 hover:text-white hover:bg-red-700 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Year selector overlay */}
          {showYearSel && (
            <div className="max-h-48 overflow-y-auto bg-white border-b border-gray-100 grid grid-cols-4 gap-0.5 p-2">
              {yearRange.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => { setViewYear(yr); setShowYearSel(false); }}
                  className={`py-1 text-xs rounded font-medium transition-colors
                    ${yr === viewYear
                      ? 'bg-red-800 text-white'
                      : 'text-gray-600 hover:bg-red-50 hover:text-red-800'
                    }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {/* Day-of-week header */}
          {!showYearSel && (
            <>
              <div className="grid grid-cols-7 px-2 pt-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 px-2 pb-3 gap-0.5">
                {cells.map(({ date, outside }, idx) => {
                  const isToday    = toYMD(date) === toYMD(today);
                  const isSel      = selected && toYMD(date) === toYMD(selected);
                  const isDisabled = isDisabledDate(date);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectDate(date)}
                      disabled={isDisabled}
                      className={[
                        'text-xs rounded-lg py-1.5 font-medium transition-all',
                        outside    ? 'text-gray-300' : 'text-gray-700',
                        isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-50 hover:text-red-800 cursor-pointer',
                        isSel      ? '!bg-red-800 !text-white shadow-sm' : '',
                        isToday && !isSel ? 'ring-1 ring-red-800 text-red-800 font-bold' : '',
                      ].join(' ')}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <div className="border-t border-gray-100 px-3 py-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => selectDate(today)}
                  disabled={isDisabledDate(today)}
                  className="text-xs text-red-800 font-semibold hover:underline disabled:opacity-40"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}