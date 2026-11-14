export function endTimeOnSameDay(startTime, endTime) {
  if (!startTime || (endTime && endTime > startTime)) return endTime;
  const [hour, minute] = startTime.split(':').map(Number);
  const total = Math.min(hour * 60 + minute + 60, 1439);
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

export function oneHourAfter(date, time) {
  const next = new Date(date + 'T' + time + ':00');
  next.setHours(next.getHours() + 1);
  return {
    date: next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0') + '-' + String(next.getDate()).padStart(2, '0'),
    time: String(next.getHours()).padStart(2, '0') + ':' + String(next.getMinutes()).padStart(2, '0'),
  };
}
