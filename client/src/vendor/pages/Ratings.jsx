import { useState, useEffect, useMemo } from "react";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { Star, User, Calendar } from "lucide-react";
import api from "../../lib/axiosConfig";

// Avatar fallback component
const Avatar = ({ name }) => (
  <div className="bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center text-gray-600 font-semibold text-xs mr-3">
    {name ? name[0].toUpperCase() : <User className="h-4 w-4" />}
  </div>
);

const Ratings = () => {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ average_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/rating/getrating");
      setRatings(response.data.ratings || []);
      setStats({
        average_rating: Math.floor(response.data.average_rating * 10) / 10 || 0,
        total_reviews: response.data.total_reviews || 0,
      });
      setLoading(false);
    } catch (error) {
      setError("Failed to load ratings");
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => setFilter(e.target.value);

  const filteredRatings = ratings.filter((rating) => {
    const matchesRating =
      filter === "all" ? true : rating.rating === parseInt(filter);

    const q = search.trim().toLowerCase();
    const matchesSearch = q
      ? (rating.user_name || "").toLowerCase().includes(q) ||
        (rating.serviceName || "").toLowerCase().includes(q) ||
        (rating.review || "").toLowerCase().includes(q)
      : true;

    const matchesService =
      serviceFilter === "all"
        ? true
        : (rating.serviceName || "").trim().toLowerCase() === serviceFilter;

    return matchesRating && matchesSearch && matchesService;
  });

  const serviceOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        (ratings || []).map((r) => (r.serviceName || "").trim()).filter(Boolean)
      )
    ).sort();

    return [
      { value: "all", label: "All Services" },
      ...names.map((n) => ({ value: n.toLowerCase(), label: n })),
    ];
  }, [ratings]);

  const renderStars = (rating) => (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < rating ? "text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  const getRatingDistribution = () => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach((r) => dist[r.rating]++);
    return dist;
  };

  const distribution = getRatingDistribution();

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-500">{error}</p>
      </div>
    );

  return (
    <section className="mx-auto ">
      <header className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Ratings & Reviews</h2>
        <p className="text-gray-500 mt-1">Real feedback from customers</p>
      </header>

      {/* Summary Card */}
      <div className="bg-white shadow-lg rounded-lg flex flex-col md:flex-row p-6 mb-4 gap-6">
        <div className="flex-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 md:pr-6">
          <span className="text-6xl font-bold text-primary-dark mb-2">
            {stats.average_rating
              ? typeof stats.average_rating === "number"
                ? stats.average_rating.toFixed(1)
                : stats.average_rating
              : "0.0"}
          </span>
          {renderStars(Math.round(stats.average_rating))}
          <span className="text-gray-500 mt-1 text-sm">
            Based on {stats.total_reviews}{" "}
            {stats.total_reviews === 1 ? "review" : "reviews"}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Rating Distribution
          </h3>
          <div>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = distribution[rating] || 0;
              const percentage = stats.total_reviews
                ? Math.round((count / stats.total_reviews) * 100)
                : 0;
              return (
                <div key={rating} className="flex items-center mb-2">
                  <span className="flex items-center text-yellow-500 font-medium w-14">
                    {rating}
                    <Star className="w-4 h-4 ml-1" />
                  </span>
                  <div className="flex-1 mx-2 bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-l-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews + Filter */}
      <div className=" min-h-[calc(100vh-200px)]">
        <div className="p-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Customer Reviews
          </h3>

          <div className="flex w-full md:w-auto gap-3 items-center justify-between my-3">
            <FormInput
              placeholder="Search reviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm"
            />

            <div className="flex gap-2">
              <FormSelect
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                options={serviceOptions}
                className="md:w-48 w-full"
                aria-label="Filter by service"
              />

              <FormSelect
                value={filter}
                onChange={handleFilterChange}
                options={[
                  { value: "all", label: "All Ratings" },
                  { value: "5", label: "5 Stars" },
                  { value: "4", label: "4 Stars" },
                  { value: "3", label: "3 Stars" },
                  { value: "2", label: "2 Stars" },
                  { value: "1", label: "1 Star" },
                ]}
                className="md:w-48 w-full"
                aria-label="Filter by rating"
              />
            </div>
          </div>
        </div>

        {filteredRatings.length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
            {filteredRatings.map((rating) => (
              <li
                key={rating.rating_id}
                className="flex py-6 px-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 items-start"
              >
                <Avatar name={rating.user_name} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">
                      {rating.user_name}
                    </span>
                    <span>{renderStars(rating.rating)}</span>
                  </div>
                  <span className=" text-xs text-gray-400 mb-2 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(rating.created_at)}
                  </span>
                  <p className="text-gray-700 mb-2">
                    {rating.review || "No written review provided."}
                  </p>
                  {rating.serviceName && (
                    <span className="inline-block text-xs bg-gray-100 rounded px-2 py-1 text-gray-500 mt-1">
                      Service: {rating.serviceName.trim()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-10 text-center text-gray-500">
            {filter === "all"
              ? "No reviews yet. Completed bookings will appear here when customers leave reviews."
              : `No ${filter}-star reviews yet.`}
          </div>
        )}
      </div>
    </section>
  );
};

export default Ratings;
