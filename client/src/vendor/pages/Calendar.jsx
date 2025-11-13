import React, { useEffect, useMemo, useState } from "react";
// import { toast } from "sonner";
import moment from "moment-timezone";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Pencil,
  Trash,
  AlertCircle,
  X,
} from "lucide-react";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import StatusBadge from "../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../shared/utils/dateUtils";
import { Button, IconButton } from "../../shared/components/Button";
import Modal from "../../shared/components/Modal/Modal";
import api from "../../lib/axiosConfig";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { toast } from "sonner";

/* ---------- Constants ---------- */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
);

// Timezone configuration
const TIMEZONE = "America/Denver"; // Mountain Time (UTC-7)
const getMoment = (date = null) => moment.tz(date || new Date(), TIMEZONE);
const toMountainTime = (date) => getMoment(date).toDate();
const fromMountainTime = (date) => getMoment(date).local().toDate();

/* ---------- Small Utils ---------- */
const startOfMonth = (d) => {
  const mt = getMoment(d).startOf("month");
  return mt.toDate();
};
const endOfMonth = (d) => {
  const mt = getMoment(d).endOf("month");
  return mt.toDate();
};
const startOfWeek = (d) => {
  const mt = getMoment(d).startOf("week");
  return mt.toDate();
};
const endOfWeek = (d) => {
  const mt = getMoment(d).endOf("week");
  return mt.toDate();
};
const isSameDay = (a, b) => {
  const mtA = getMoment(a);
  const mtB = getMoment(b);
  return mtA.isSame(mtB, "day");
};
const toDateKey = (d) => getMoment(d).format("YYYY-MM-DD");

const inRange = (date, s, e) => {
  const mtDate = getMoment(date).startOf("day");
  const mtStart = getMoment(s).startOf("day");
  const mtEnd = getMoment(e).startOf("day");
  return mtDate.isBetween(mtStart, mtEnd, "day", "[]");
};

/* ---------- Date helpers for Mountain Time ---------- */
const toInputDate = (d) => {
  return getMoment(d).format("YYYY-MM-DD");
};
const todayISO = () => {
  return getMoment().format("YYYY-MM-DD");
};
const clampToTodayISO = (iso) => {
  const today = todayISO();
  return iso && iso >= today ? iso : today;
};
const isPastISO = (iso) => {
  const today = todayISO();
  return iso < today;
};

/* ---------- Status UI (Tailwind classes, no inline colors) ---------- */
const statusUI = (s) => {
  switch (s) {
    case 0:
      return {
        name: "Pending",
        wrap: "bg-yellow-50 border-yellow-200 text-yellow-800",
        dot: "bg-yellow-400",
      };
    case 1:
      return {
        name: "Accepted",
        wrap: "bg-emerald-50 border-emerald-200 text-emerald-800",
        dot: "bg-emerald-500",
      };
    case 2:
      return {
        name: "Rejected",
        wrap: "bg-red-50 border-red-200 text-red-800",
        dot: "bg-red-500",
      };
    default:
      return {
        name: "Done",
        wrap: "bg-blue-50 border-blue-200 text-blue-800",
        dot: "bg-blue-500",
      };
  }
};

const Calendar = () => {
  /* ---------- State ---------- */
  const [bookings, setBookings] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [error, setError] = useState(null);

  const [currentDate, setCurrentDate] = useState(toMountainTime(new Date()));
  const [viewMode, setViewMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAvailToEdit, setSelectedAvailToEdit] = useState(null);

  // delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMode, setDeleteMode] = useState("all");
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteBookedDates, setDeleteBookedDates] = useState([]);

  // create/edit form
  const emptyForm = {
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "18:00",
  };
  const [availabilityForm, setAvailabilityForm] = useState(emptyForm);

  /* ---------- Effects ---------- */
  useEffect(() => {
    fetchBookings();
    fetchAvailabilities();
  }, []);

  /* ---------- API ---------- */
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/booking/vendorassignedservices");
      setBookings(data.bookings || []);
    } catch {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailabilities = async () => {
    try {
      setLoadingAvail(true);
      const { data } = await api.get("/api/vendor/get-availability");
      setAvailabilities(data.availabilities || []);
    } catch {
      toast.error("Failed to load availabilities");
    } finally {
      setLoadingAvail(false);
    }
  };

  const createAvailability = async (payload) => {
    try {
      const { data } = await api.post("/api/vendor/set-availability", payload);
      toast.success(data.message || "Availability set successfully");
      setShowCreateModal(false);
      setAvailabilityForm(emptyForm);
      await fetchAvailabilities();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to create availability"
      );
    }
  };

  const updateAvailability = async (id, payload) => {
    try {
      const { data } = await api.put(
        `/api/vendor/edit-availability/${id}`,
        payload
      );
      toast.success(data.message || "Availability updated successfully");
      setShowEditModal(false);
      setSelectedAvailToEdit(null);
      setAvailabilityForm(emptyForm);
      await fetchAvailabilities();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to update availability"
      );
    }
  };

  const openDeleteModal = (av) => {
    setDeleteTarget(av);
    setDeleteMode("all");
    setDeleteBookedDates([]);

    // Clamp delete window to today-or-later but still inside availability
    const minInside = av?.startDate
      ? clampToTodayISO(av.startDate)
      : todayISO();
    const maxInside = av?.endDate || minInside;

    setDeleteStartDate(minInside);
    setDeleteEndDate(minInside > maxInside ? minInside : maxInside);
    setShowDeleteModal(true);
  };

  const submitDeleteAvailability = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.vendor_availability_id || deleteTarget.id;
    const url = `/api/vendor/delete-availability/${id}`;

    if (deleteMode === "date") {
      if (!deleteStartDate || !deleteEndDate)
        return toast.error("Please select a start and end date");

      if (isPastISO(deleteStartDate) || isPastISO(deleteEndDate))
        return toast.error("Dates cannot be in the past");

      if (deleteEndDate < deleteStartDate)
        return toast.error("End date must be after or same as start date");
    }

    const payload =
      deleteMode === "all"
        ? {}
        : { startDate: deleteStartDate, endDate: deleteEndDate };

    try {
      setDeleteBusy(true);
      setDeleteBookedDates([]);
      const res = await api.delete(url, { data: payload });
      toast.success(res?.data?.message || "Availability deleted successfully");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await fetchAvailabilities();
    } catch (err) {
      setDeleteBookedDates(err?.response?.data?.bookedDates || []);
      toast.error(
        err?.response?.data?.message ||
          "Failed to delete availability. Please try again."
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  /* ---------- Derived ---------- */
  const monthMatrix = useMemo(() => {
    const ms = startOfMonth(currentDate),
      me = endOfMonth(currentDate);
    const start = getMoment(ms).startOf("week");
    const end = getMoment(me).endOf("week");

    const weeks = [];
    const it = start.clone();

    while (it.isBefore(end) || it.isSame(end, "day")) {
      const w = [];
      for (let i = 0; i < 7; i++) {
        w.push(it.toDate());
        it.add(1, "day");
      }
      weeks.push(w);
    }
    return weeks;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const s = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = getMoment(s).add(i, "days");
      return d.toDate();
    });
  }, [currentDate]);

  const bookingsByDay = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const rawDate = b.bookingDate || b.date || b.dateBooked || b.booking_date;
      const d = getMoment(rawDate);
      const k = d.format("YYYY-MM-DD");
      (map[k] ||= []).push(b);
    });
    Object.keys(map).forEach((k) =>
      map[k].sort((a, b) =>
        (a.bookingTime || "").localeCompare(b.bookingTime || "")
      )
    );
    return map;
  }, [bookings]);

  const availabilitiesForDate = (date) =>
    availabilities.filter((av) => inRange(date, av.startDate, av.endDate));
  const hasAvailability = (date) =>
    availabilities.some((av) => inRange(date, av.startDate, av.endDate));
  const selectedDateAvailabilities = useMemo(
    () => (selectedDate ? availabilitiesForDate(selectedDate) : []),
    [selectedDate, availabilities]
  );

  /* ---------- Interactions ---------- */
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const key = getMoment(date).format("YYYY-MM-DD");
    setSelectedBookings(bookingsByDay[key] || []);
  };

  const handlePreviousPeriod = () => {
    let newDate;
    if (viewMode === "month") {
      newDate = getMoment(currentDate).subtract(1, "month").toDate();
    } else if (viewMode === "week") {
      newDate = getMoment(currentDate).subtract(1, "week").toDate();
    } else {
      newDate = getMoment(currentDate).subtract(1, "day").toDate();
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    let newDate;
    if (viewMode === "month") {
      newDate = getMoment(currentDate).add(1, "month").toDate();
    } else if (viewMode === "week") {
      newDate = getMoment(currentDate).add(1, "week").toDate();
    } else {
      newDate = getMoment(currentDate).add(1, "day").toDate();
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(toMountainTime(new Date()));

  /* ---------- Header ---------- */
  const renderHeader = () => {
    const currentMoment = getMoment(currentDate);
    const title =
      viewMode === "month"
        ? currentMoment.format("MMMM YYYY")
        : viewMode === "week"
        ? `${getMoment(startOfWeek(currentDate)).format("MMM D")} - ${getMoment(
            endOfWeek(currentDate)
          ).format("MMM D, YYYY")}`
        : currentMoment.format("dddd, MMMM D, YYYY");

    return (
      <div className="flex flex-col items-center justify-between gap-4 pb-6 sm:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <IconButton
              onClick={handlePreviousPeriod}
              variant="lightBlack"
              icon={<ArrowLeft size={20} />}
            />
            <h2 className="text-xl text-center font-bold text-gray-800 w-48">
              {title}
            </h2>
            <IconButton
              onClick={handleNextPeriod}
              variant="lightBlack"
              icon={<ArrowRight size={20} />}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <FormSelect
            className="w-32"
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
              { value: "day", label: "Day" },
            ]}
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          />
          <Button
            onClick={handleToday}
            variant="ghost"
            className="whitespace-nowrap"
          >
            Today
          </Button>

          <Button
            onClick={() => {
              const base = selectedDate
                ? toInputDate(selectedDate)
                : toInputDate(new Date());
              const safe = clampToTodayISO(base);
              setAvailabilityForm({
                startDate: safe,
                endDate: safe,
                startTime: "09:00",
                endTime: "18:00",
              });
              setShowCreateModal(true);
            }}
            icon={<Plus size={16} />}
            className="whitespace-nowrap"
          >
            New Availability
          </Button>
        </div>
      </div>
    );
  };

  /* ---------- Month View ---------- */
  const renderMonthMain = () => (
    <div className="overflow-hidden bg-white border shadow-md rounded-xl">
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-sm font-medium text-center text-gray-500"
          >
            {d}
          </div>
        ))}
      </div>
      <div>
        {monthMatrix.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7">
            {week.map((day) => {
              const dayMoment = getMoment(day);
              const key = dayMoment.format("YYYY-MM-DD");
              const dayBookings = bookingsByDay[key] || [];
              const isCurrentMonth =
                dayMoment.month() === getMoment(currentDate).month();
              const isToday = dayMoment.isSame(getMoment(), "day");
              const dayAvs = availabilitiesForDate(day);
              const isAvailable = dayAvs.length > 0;

              return (
                <div
                  key={key}
                  onClick={() => handleDateClick(day)}
                  className={`border p-2 sm:min-h-[100px] min-h-[64px] cursor-pointer transition rounded-md relative ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-300"
                  } ${
                    isToday
                      ? "border-2 border-emerald-400 bg-white"
                      : "border-gray-200"
                  } ${
                    isAvailable && !isToday ? "bg-emerald-50" : ""
                  } hover:bg-emerald-100`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`text-xs font-semibold ${
                        isToday
                          ? "text-emerald-600"
                          : isCurrentMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                      }`}
                    >
                      {dayMoment.date()}
                    </div>
                    <div className="flex items-center gap-1">
                      {dayAvs.slice(0, 2).map((av) => (
                        <span
                          key={av.vendor_availability_id || av.id}
                          title={`${av.startTime || ""} ${av.endTime || ""}`}
                          className="px-1.5 py-0.5 text-[10px] rounded-full text-white shadow-sm bg-emerald-600"
                        >
                          Av
                        </span>
                      ))}
                      {!!dayBookings.length && (
                        <span className="ml-1 text-[10px] bg-blue-500 text-white px-2 rounded-full">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 max-h-[60px] overflow-hidden">
                    {dayBookings.slice(0, 3).map((b) => {
                      const sc = statusUI(b.bookingStatus);
                      return (
                        <div
                          key={b.booking_id || b.bookingId}
                          className={`flex items-center justify-between px-2 py-1 text-xs truncate border rounded ${sc.wrap}`}
                        >
                          <div className="truncate flex gap-1.5 items-center">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${sc.dot}`}
                            />
                            <span className="truncate">
                              {b.bookingTime?.slice(0, 5) || ""} • {b.userName}
                            </span>
                          </div>
                          <div className="ml-2 text-[11px]">{sc.name}</div>
                        </div>
                      );
                    })}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-right text-blue-500">
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  /* ---------- Week View ---------- */
  const renderWeekMain = () => (
    <div className="overflow-hidden bg-white border shadow-md rounded-xl">
      <div className="grid grid-cols-[60px_1fr]">
        <div />
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((d) => {
            const dayMoment = getMoment(d);
            const dayAvs = availabilitiesForDate(d);
            const isToday = dayMoment.isSame(getMoment(), "day");
            return (
              <div
                key={dayMoment.format()}
                className={`py-2 text-sm font-medium text-center ${
                  isToday ? "border-emerald-300" : ""
                } ${dayAvs.length ? "bg-emerald-50" : ""}`}
              >
                <div>{dayMoment.format("ddd")}</div>
                <div
                  className={`text-xs ${
                    isToday ? "font-bold text-emerald-700" : "text-gray-500"
                  }`}
                >
                  {dayMoment.date()}
                </div>
                {dayAvs.length > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {dayAvs.slice(0, 2).map((av) => (
                      <span
                        key={av.vendor_availability_id || av.id}
                        className="w-[26px] h-2 rounded-full bg-emerald-500"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[60px_1fr] h-[520px] overflow-auto">
        <div className="border-r">
          <div className="flex flex-col">
            {HOURS.map((h) => (
              <div
                key={h}
                className="h-10 py-1 pr-2 text-xs text-right text-gray-400"
              >
                {h}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 divide-x">
          {weekDays.map((d) => {
            const dayMoment = getMoment(d);
            const key = dayMoment.format("YYYY-MM-DD");
            const dayBookings = bookingsByDay[key] || [];
            const dayAvs = availabilitiesForDate(d);
            const isToday = dayMoment.isSame(getMoment(), "day");

            return (
              <div
                key={key}
                className={`min-h-full p-2 relative ${
                  isToday ? "border-emerald-300" : ""
                } ${dayAvs.length ? "bg-emerald-50" : ""}`}
                onClick={() => handleDateClick(d)}
              >
                {dayBookings.length ? (
                  dayBookings.map((b) => {
                    const hour =
                      parseInt((b.bookingTime || "00:00").split(":")[0], 10) ||
                      0;
                    const top = (hour / 24) * 100;
                    const sc = statusUI(b.bookingStatus);
                    return (
                      <div
                        key={b.booking_id || b.bookingId}
                        style={{ top: `${top}%` }}
                        className="absolute left-2 right-2"
                      >
                        <div
                          className={`p-2 text-xs border rounded shadow-sm w-full ${sc.wrap}`}
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${sc.dot}`}
                            />
                            <div className="truncate">
                              {b.bookingTime?.slice(0, 5) || ""} •{" "}
                              {b.serviceName}
                            </div>
                          </div>
                          <div className="truncate text-gray-700 text-[12px]">
                            {b.userName}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-300">
                    No bookings
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ---------- Day View ---------- */
  const renderDayMain = () => {
    const dayMoment = getMoment(currentDate);
    const key = dayMoment.format("YYYY-MM-DD");
    const dayBookings = bookingsByDay[key] || [];
    const dayAvs = availabilitiesForDate(currentDate);
    const isAvailable = !!dayAvs.length;
    const isToday = dayMoment.isSame(getMoment(), "day");

    return (
      <div
        className={`overflow-hidden border shadow-md rounded-xl ${
          isAvailable ? "border-emerald-200" : "bg-white"
        } ${isToday ? "border-emerald-300" : ""}`}
      >
        <div
          className={`p-5 border-b bg-gray-50 ${
            isAvailable ? "bg-emerald-50" : ""
          }`}
        >
          <h3 className="text-lg font-semibold text-gray-800">
            {dayMoment.format("dddd, MMMM D, YYYY")}
          </h3>
          {isAvailable && (
            <div className="mt-1 text-sm text-emerald-700">
              You have availability set for this day
            </div>
          )}

          {dayAvs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {dayAvs.map((a) => (
                <div
                  key={a.vendor_availability_id}
                  className="flex items-center gap-2 px-3 py-1 text-sm border rounded-full bg-emerald-100 text-emerald-700 border-emerald-200"
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <div className="text-xs">
                    {a.startTime} - {a.endTime}{" "}
                    <span className="text-xs text-gray-500">
                      ({a.startDate}
                      {a.startDate !== a.endDate ? ` → ${a.endDate}` : ""})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4">
          {dayAvs.length > 0 ? (
            <div className="mb-4 space-y-2">
              {dayAvs.map((a) => (
                <div
                  key={a.vendor_availability_id}
                  className="flex items-center justify-between p-3 border rounded bg-emerald-50 border-emerald-200"
                >
                  <div>
                    <div className="text-sm font-medium text-emerald-700">
                      {a.startTime} - {a.endTime}
                    </div>
                    <div className="text-xs text-gray-600">
                      {a.startDate}
                      {a.startDate !== a.endDate && ` → ${a.endDate}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4 text-sm text-gray-500">
              No availability for this day
            </div>
          )}

          <div className="divide-y">
            {dayBookings.length ? (
              dayBookings.map((b) => {
                const sc = statusUI(b.bookingStatus);
                return (
                  <div
                    key={b.booking_id || b.bookingId}
                    className={`flex items-start justify-between p-4 mb-2 rounded-lg border ${sc.wrap}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
                        <Clock size={16} />{" "}
                        <span>{formatTime(b.bookingTime)}</span>
                      </div>
                      <h4 className="font-bold text-gray-700 truncate">
                        {b.serviceName}
                      </h4>
                      <div className="mt-1 text-sm text-gray-600">
                        <User size={16} className="inline" /> {b.userName}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${sc.dot}`}
                        />
                        <StatusBadge status={b.bookingStatus} />
                      </div>
                      {b.bookingStatus === 0 && (
                        <div className="flex gap-2 mt-1">
                          <button className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs hover:bg-emerald-100">
                            <CheckCircle className="mr-1" size={16} /> Accept
                          </button>
                          <button className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs hover:bg-red-100">
                            <XCircle className="mr-1" size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400">
                No bookings scheduled for this day
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ---------- Aside (Selected Date) ---------- */
  const renderSelectedDateDetails = () => {
    if (!selectedDate)
      return (
        <div className="hidden p-8 bg-white border-l shadow-md lg:block rounded-xl">
          <div className="text-center text-gray-400">
            Select a day to view bookings & availability
          </div>
        </div>
      );

    const selectedMoment = getMoment(selectedDate);
    const isAvailable = hasAvailability(selectedDate);

    return (
      <>
        <div className="px-2 py-1 my-3 text-xs text-center text-gray-800 bg-gray-100 rounded w-fit">
          MT: {getMoment().format("YYYY-MM-DD HH:mm")}
        </div>
        <aside className="w-full lg:w-[340px] p-5 bg-white border-l rounded-xl shadow-md">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold">
                {selectedMoment.format("dddd, MMMM D, YYYY")}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedBookings.length} booking
                {selectedBookings.length !== 1 ? "s" : ""} •{" "}
                {selectedDateAvailabilities.length} availability
                {selectedDateAvailabilities.length !== 1 ? "s" : ""}
              </p>
              {isAvailable && (
                <p className="mt-1 text-xs text-emerald-700">
                  This day has availability set
                </p>
              )}
            </div>
            <IconButton
              onClick={() => {
                setSelectedDate(null);
                setSelectedBookings([]);
              }}
              variant="lightDanger"
              icon={<X size={20} />}
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Availabilities</h4>
              <Button
                size="sm"
                variant="lightInherit"
                onClick={() => {
                  const base = toInputDate(selectedDate);
                  const safe = clampToTodayISO(base);
                  setAvailabilityForm({
                    startDate: safe,
                    endDate: safe,
                    startTime: "09:00",
                    endTime: "18:00",
                  });
                  setShowCreateModal(true);
                }}
              >
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {selectedDateAvailabilities.length ? (
                selectedDateAvailabilities
                  .slice()
                  .sort((a, b) =>
                    (a.startTime || "").localeCompare(b.startTime || "")
                  )
                  .map((a) => (
                    <div
                      key={a.vendor_availability_id}
                      className="flex items-start justify-between p-3 border rounded bg-emerald-50/50 border-emerald-100"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-emerald-700">
                          {a.startTime} - {a.endTime}
                        </div>
                        <div className="text-xs truncate text-emerald-700">
                          {a.startDate}{" "}
                          {a.startDate !== a.endDate && `→ ${a.endDate}`}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-3">
                        <IconButton
                          onClick={() => openEditModal(a)}
                          title="Edit"
                          variant="lightBlack"
                          icon={<Pencil size={14} />}
                        />
                        <IconButton
                          onClick={() => openDeleteModal(a)}
                          title="Delete"
                          variant="lightDanger"
                          icon={<Trash size={14} />}
                        />
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-3 text-sm text-gray-500">
                  No availability
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold">Bookings</h4>
              <div className="divide-y">
                {selectedBookings.length ? (
                  selectedBookings
                    .slice()
                    .sort((a, b) =>
                      (a.bookingTime || "").localeCompare(b.bookingTime || "")
                    )
                    .map((b) => {
                      return (
                        <div
                          key={b.booking_id || b.bookingId}
                          className={`flex items-start justify-between px-2 py-3 border rounded `}
                        >
                          <div className="flex items-center min-w-0 gap-2">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full`}
                            />
                            <div>
                              <div className="text-sm font-medium truncate">
                                {b.serviceName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {b.bookingTime} • {b.userName}
                              </div>
                            </div>
                          </div>
                          <div className="ml-3">
                            <StatusBadge status={b.bookingStatus} />
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-6 text-sm text-gray-500">No bookings</div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </>
    );
  };

  /* ---------- Submit handlers with HARD validation ---------- */
  const submitCreateAvailability = async () => {
    const { startDate, endDate, startTime, endTime } = availabilityForm;
    if (!startDate || !endDate || !startTime || !endTime)
      return toast.error("All fields are required");

    if (isPastISO(startDate) || isPastISO(endDate))
      return toast.error("Dates cannot be in the past");

    if (endDate < startDate)
      return toast.error("End date must be after or same as start date");

    setLoadingAvail(true);
    await createAvailability({ startDate, endDate, startTime, endTime });
    setLoadingAvail(false);
  };

  const openEditModal = (av) => {
    setSelectedAvailToEdit(av);
    setAvailabilityForm({
      startDate: av.startDate,
      endDate: av.endDate,
      startTime: av.startTime || "09:00",
      endTime: av.endTime || "18:00",
    });
    setShowEditModal(true);
  };

  const submitEditAvailability = async () => {
    if (!selectedAvailToEdit) return;
    const { startDate, endDate, startTime, endTime } = availabilityForm;
    if (!startDate || !endDate || !startTime || !endTime)
      return toast.error("All fields are required");

    if (isPastISO(startDate) || isPastISO(endDate))
      return toast.error("Dates cannot be in the past");

    if (endDate < startDate)
      return toast.error("End date must be after or same as start date");

    setLoadingAvail(true);
    await updateAvailability(selectedAvailToEdit.vendor_availability_id, {
      startDate,
      endDate,
      startTime,
      endTime,
    });
    setLoadingAvail(false);
  };

  /* ---------- Guards ---------- */
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  if (error)
    return (
      <div className="p-4 rounded-md bg-red-50">
        <p className="text-red-500">{error}</p>
      </div>
    );

  /* ---------- Render ---------- */
  return (
    <div className="mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Vendor Calendar</h2>
      <div className="flex flex-col lg:flex-row gap-7">
        <div className="flex-1 min-w-0">
          {renderHeader()}
          <div className="mt-2">
            {viewMode === "month" && renderMonthMain()}
            {viewMode === "week" && renderWeekMain()}
            {viewMode === "day" && renderDayMain()}
          </div>
        </div>
        <div className="w-full lg:w-[340px] shrink-0">
          {renderSelectedDateDetails()}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          onClose={() => setShowCreateModal(false)}
          isOpen={showCreateModal}
          title="New Availability"
        >
          <div className="space-y-3">
            {/* Start Date */}
            <div>
              <FormInput
                label="Start date"
                value={availabilityForm.startDate}
                onChange={(e) => {
                  const v = clampToTodayISO(e.target.value);
                  setAvailabilityForm((s) => ({
                    ...s,
                    startDate: v,
                    endDate: s.endDate && s.endDate < v ? v : s.endDate || v, // keep end >= start
                  }));
                }}
                type="date"
                min={todayISO()}
              />
            </div>

            {/* End Date */}
            <div>
              <FormInput
                label="End date"
                value={availabilityForm.endDate}
                onChange={(e) => {
                  const v = e.target.value;
                  const minEnd =
                    availabilityForm.startDate &&
                    availabilityForm.startDate > todayISO()
                      ? availabilityForm.startDate
                      : todayISO();
                  setAvailabilityForm((s) => ({
                    ...s,
                    endDate: v < minEnd ? minEnd : v,
                  }));
                }}
                type="date"
                min={
                  availabilityForm.startDate &&
                  availabilityForm.startDate > todayISO()
                    ? availabilityForm.startDate
                    : todayISO()
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {["startTime", "endTime"].map((k) => (
                <div key={k}>
                  <FormInput
                    label={k === "startTime" ? "Start time" : "End time"}
                    value={availabilityForm[k]}
                    onChange={(e) =>
                      setAvailabilityForm((s) => ({
                        ...s,
                        [k]: e.target.value,
                      }))
                    }
                    type="time"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="lightInherit"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitCreateAvailability}
                disabled={loadingAvail}
              >
                {loadingAvail ? "Saving..." : "Create"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Modal
          onClose={() => setShowEditModal(false)}
          isOpen={showEditModal}
          title="Edit Availability"
        >
          <div className="space-y-3">
            {/* Start Date */}
            <div>
              <FormInput
                label="Start date"
                value={availabilityForm.startDate}
                onChange={(e) => {
                  const v = clampToTodayISO(e.target.value);
                  setAvailabilityForm((s) => ({
                    ...s,
                    startDate: v,
                    endDate: s.endDate && s.endDate < v ? v : s.endDate || v,
                  }));
                }}
                type="date"
                min={todayISO()}
              />
            </div>

            {/* End Date */}
            <div>
              <FormInput
                label="End date"
                value={availabilityForm.endDate}
                onChange={(e) => {
                  const v = e.target.value;
                  const minEnd =
                    availabilityForm.startDate &&
                    availabilityForm.startDate > todayISO()
                      ? availabilityForm.startDate
                      : todayISO();
                  setAvailabilityForm((s) => ({
                    ...s,
                    endDate: v < minEnd ? minEnd : v,
                  }));
                }}
                type="date"
                min={
                  availabilityForm.startDate &&
                  availabilityForm.startDate > todayISO()
                    ? availabilityForm.startDate
                    : todayISO()
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {["startTime", "endTime"].map((k) => (
                <div key={k}>
                  <FormInput
                    label={k === "startTime" ? "Start time" : "End time"}
                    value={availabilityForm[k]}
                    onChange={(e) =>
                      setAvailabilityForm((s) => ({
                        ...s,
                        [k]: e.target.value,
                      }))
                    }
                    type="time"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="lightInherit"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={submitEditAvailability} disabled={loadingAvail}>
                {loadingAvail ? "Saving..." : "Update"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete availability"
        >
          <>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  className="accent-green-600"
                  checked={deleteMode === "all"}
                  onChange={() => setDeleteMode("all")}
                />
                <>
                  <h3 className="font-medium text-gray-800">
                    Delete entire availability
                  </h3>
                </>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  className="mt-1 accent-green-600"
                  checked={deleteMode === "date"}
                  onChange={() => setDeleteMode("date")}
                />
                <div className="w-full">
                  <div className="font-medium text-gray-800">
                    Delete a specific date range
                  </div>
                  <div className="grid grid-cols-1 gap-2 mt-2 sm:grid-cols-2">
                    <div>
                      <FormInput
                        type="date"
                        label="Start date (inside range)"
                        value={deleteStartDate}
                        min={
                          deleteTarget
                            ? deleteTarget.startDate > todayISO()
                              ? deleteTarget.startDate
                              : todayISO()
                            : todayISO()
                        }
                        max={deleteTarget?.endDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDeleteStartDate(v);
                          setDeleteEndDate((cur) => (cur < v ? v : cur));
                        }}
                        disabled={deleteMode !== "date"}
                      />
                    </div>
                    <div>
                      <FormInput
                        type="date"
                        label="End date (inside range)"
                        value={deleteEndDate}
                        min={deleteStartDate || todayISO()}
                        max={deleteTarget?.endDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          const minEnd = deleteStartDate || todayISO();
                          setDeleteEndDate(v < minEnd ? minEnd : v);
                        }}
                        disabled={deleteMode !== "date"}
                      />
                    </div>
                  </div>
                </div>
              </label>

              {deleteBookedDates.length > 0 && (
                <div className="flex items-start gap-2 p-3 text-sm border border-yellow-200 rounded bg-yellow-50">
                  <AlertCircle className="mt-0.5 text-yellow-600" size={18} />
                  <div className="text-yellow-800">
                    <div className="font-medium">
                      Cannot delete on booked date(s):
                    </div>
                    <div className="mt-1">{deleteBookedDates.join(", ")}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="lightInherit"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                variant="lightError"
                onClick={submitDeleteAvailability}
                disabled={
                  deleteBusy ||
                  (deleteMode === "date" &&
                    (!deleteStartDate || !deleteEndDate))
                }
              >
                {deleteBusy ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </>
        </Modal>
      )}
    </div>
  );
};

export default Calendar;
