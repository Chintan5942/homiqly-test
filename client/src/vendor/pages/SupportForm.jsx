import React, { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { FormInput, FormTextarea } from "../../shared/components/Form";
import { Button } from "../../shared/components/Button";
import { toast } from "react-toastify";

const SupportForm = () => {
  const [form, setForm] = useState({
    name: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);

  // Fetch vendor tickets and name on mount
  const fetchVendor = async () => {
    try {
      const res = await api.get("/api/vendor");
      const vendorTickets = res.data?.tickets || [];
      setTickets(vendorTickets);
    } catch (err) {
      console.error("Failed to fetch vendor:", err);
      toast.error("Failed to load vendor details.");
    }
  };

  useEffect(() => {
    fetchVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.subject.trim() || !form.message.trim()) {
      toast.error("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/contact", form);
      toast.success("Ticket sent successfully!");
      setForm({ name: "", subject: "", message: "" });
      await fetchVendor(); // await to ensure tickets refresh after submit
    } catch (error) {
      toast.error("Failed to send ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Support Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-lg mx-auto space-y-4"
        noValidate
      >
        <FormInput
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Your Name"
          label="Name"
        />
        <FormInput
          id="subject"
          name="subject"
          value={form.subject}
          onChange={handleChange}
          placeholder="Subject"
          label="Subject"
        />
        <FormTextarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Describe your issue"
          required
          label="Message"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Submit Ticket"}
          </Button>
        </div>
      </form>

      {/* Tickets Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                ID
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                Vendor Name
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                Subject
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                Message
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                Status
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                Created At
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <tr
                  key={ticket.ticket_id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-4 py-2 text-sm">{ticket.ticket_id}</td>
                  <td className="px-4 py-2 text-sm">{ticket.vendor_name}</td>
                  <td className="px-4 py-2 text-sm">{ticket.subject}</td>
                  <td className="px-4 py-2 text-sm">{ticket.message}</td>
                  <td className="px-4 py-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        ticket.status === "open"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {ticket.created_at
                      ? new Date(ticket.created_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-4 text-center text-gray-500 text-sm"
                >
                  No tickets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupportForm;
