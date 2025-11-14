import { useEffect, useState } from "react";
import { FaEye, FaTrash, FaUserPlus } from "react-icons/fa";
import {
  getAllUsers,
  deleteUser,
  createUser,
} from "../../../services/api/userService";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";

function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [addingUser, setAddingUser] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    email: "",
    password: "",
    enabled: true,
    fullname: "",
    address: "",
    phoneNumber: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 7; // 7 records per page

  const token = localStorage.getItem("token");

  // Lấy danh sách người dùng
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        setError("Vui lòng đăng nhập với vai trò ADMIN.");
        toast.error("Vui lòng đăng nhập với vai trò ADMIN.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        });
        setLoading(false);
        return;
      }

      try {
        const usersData = await getAllUsers(token);
        console.log("Users data from API:", usersData); // Debug log
        const enrichedUsers = usersData.map((user) => {
          // Ưu tiên full_name (snake_case) vì đây là tên trường trong database
          const fullname =
            user.full_name || user.fullname || user.fullName || "";
          const address = user.address || "";
          const phoneNumber = user.phone_number || user.phoneNumber || "";

          return {
            id: user.username,
            username: user.username,
            fullname: fullname,
            email: user.email || "",
            address: address,
            phoneNumber: phoneNumber,
            status: user.enabled ? "active" : "inactive",
            enabled: user.enabled,
            roles: user.roles || ["USER"],
          };
        });
        setUsers(enrichedUsers);
        setError(null);
      } catch (err) {
        setError(err.message || "Không thể tải danh sách người dùng.");
        toast.error(err.message || "Không thể tải danh sách người dùng.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  // Xóa người dùng
  const handleDelete = async (username) => {
    if (!token) {
      setError("Vui lòng đăng nhập để thực hiện hành động này.");
      toast.error("Vui lòng đăng nhập để thực hiện hành động này.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Xác nhận xóa người dùng",
      text: `Bạn có chắc chắn muốn xóa người dùng ${username}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      await deleteUser(token, username);
      setUsers(users.filter((user) => user.id !== username));
      toast.success(`Xóa người dùng ${username} thành công!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
      setError(null);
      // Adjust current page if necessary
      if (currentUsers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      setError(err.message || "Không thể xóa người dùng.");
      toast.error(err.message || "Không thể xóa người dùng.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
    }
  };

  // Xem chi tiết người dùng
  const handleView = (user) => {
    setViewingUser(user);
  };

  // Bắt đầu thêm người dùng
  const handleAddUser = () => {
    setAddingUser(true);
    setAddForm({
      username: "",
      email: "",
      password: "",
      enabled: true,
      fullname: "",
      address: "",
      phoneNumber: "",
    });
    setError(null);
  };

  // Kiểm tra định dạng form thêm người dùng
  const validateAddForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!addForm.username.trim()) {
      setError("Tên đăng nhập không được để trống.");
      return false;
    }
    if (!emailRegex.test(addForm.email)) {
      setError("Email không hợp lệ.");
      return false;
    }
    if (!addForm.password.trim()) {
      setError("Mật khẩu không được để trống.");
      return false;
    }
    if (!addForm.fullname.trim()) {
      setError("Họ và tên không được để trống.");
      return false;
    }
    return true;
  };

  // Thêm người dùng
  const handleCreate = async () => {
    if (!validateAddForm()) {
      toast.error(error, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
      return;
    }

    setCreateLoading(true);
    try {
      const response = await createUser(token, {
        username: addForm.username,
        email: addForm.email,
        password: addForm.password,
        enabled: addForm.enabled,
        roles: ["USER"],
        fullname: addForm.fullname,
        address: addForm.address || undefined,
        phoneNumber: addForm.phoneNumber || undefined,
      });

      // Kiểm tra nhiều khả năng tên trường từ response
      const fullname =
        response.fullname ||
        response.fullName ||
        response.full_name ||
        addForm.fullname ||
        "";
      const address = response.address || addForm.address || "";
      const phoneNumber =
        response.phoneNumber ||
        response.phone_number ||
        addForm.phoneNumber ||
        "";

      const newUser = {
        id: response.username,
        username: response.username,
        fullname: fullname,
        email: response.email || "",
        address: address,
        phoneNumber: phoneNumber,
        status: addForm.enabled ? "active" : "inactive",
        enabled: addForm.enabled,
        roles: ["USER"],
      };
      setUsers([...users, newUser]);
      setAddingUser(false);
      toast.success(`Thêm người dùng ${response.username} thành công!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
      setError(null);
      setCurrentPage(1); // Reset to first page after adding user
    } catch (err) {
      setError(err.message || "Không thể tạo người dùng.");
      toast.error(err.message || "Không thể tạo người dùng.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Đang tải...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error}
      </div>
    );

  return (
    <div className="container mx-auto p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <ToastContainer />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight">
          Quản Lý Người Dùng
        </h2>
        <button
          className="flex items-center px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto justify-center"
          onClick={handleAddUser}
        >
          <FaUserPlus className="mr-2" /> Thêm Người Dùng
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-indigo-100 text-indigo-900">
                <th className="p-3 sm:p-4 text-left font-semibold text-xs sm:text-sm">
                  #
                </th>
                <th className="p-3 sm:p-4 text-left font-semibold text-xs sm:text-sm">
                  Họ và Tên
                </th>
                <th className="p-3 sm:p-4 text-left font-semibold text-xs sm:text-sm">
                  Email
                </th>
                <th className="p-3 sm:p-4 text-left font-semibold text-xs sm:text-sm">
                  Trạng Thái
                </th>
                <th className="p-3 sm:p-4 text-left font-semibold text-xs sm:text-sm">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 py-6">
                    Không có người dùng nào
                  </td>
                </tr>
              ) : (
                currentUsers.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-all duration-200"
                  >
                    <td className="p-3 sm:p-4 border-t border-gray-200 text-xs sm:text-sm">
                      {idx + 1 + (currentPage - 1) * usersPerPage}
                    </td>
                    <td className="p-3 sm:p-4 border-t border-gray-200 text-xs sm:text-sm">
                      {user.fullname && user.fullname.trim()
                        ? user.fullname
                        : "N/A"}
                    </td>
                    <td className="p-3 sm:p-4 border-t border-gray-200 text-xs sm:text-sm break-words">
                      {user.email || "N/A"}
                    </td>
                    <td className="p-3 sm:p-4 border-t border-gray-200">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs sm:text-sm font-medium rounded-full ${
                          user.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.status === "active" ? "Hoạt động" : "Ngừng"}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 border-t border-gray-200">
                      <div className="flex space-x-2 sm:space-x-3">
                        <button
                          className="p-1.5 sm:p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-all duration-200 text-xs sm:text-sm"
                          onClick={() => handleView(user)}
                          title="Xem chi tiết"
                        >
                          <FaEye />
                        </button>
                        <button
                          className="p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 text-xs sm:text-sm"
                          onClick={() => handleDelete(user.id)}
                          title="Xóa"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {users.length > usersPerPage && (
          <div className="flex flex-wrap justify-center items-center gap-2 py-4 px-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                currentPage === 1
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-500 text-white hover:bg-indigo-600"
              }`}
            >
              Previous
            </button>
            {[...Array(totalPages).keys()].map((page) => (
              <button
                key={page + 1}
                onClick={() => handlePageChange(page + 1)}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                  currentPage === page + 1
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {page + 1}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                currentPage === totalPages
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-500 text-white hover:bg-indigo-600"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal xem chi tiết */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-4xl shadow-2xl backdrop-blur-lg my-4">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                Chi Tiết Người Dùng
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setViewingUser(null)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên Đăng Nhập:
                </label>
                <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-2 rounded-lg">
                  {viewingUser.username}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và Tên:
                </label>
                <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-2 rounded-lg">
                  {viewingUser.fullname || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email:
                </label>
                <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-2 rounded-lg break-words">
                  {viewingUser.email || "N/A"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa Chỉ:
                </label>
                <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-2 rounded-lg">
                  {viewingUser.address || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số Điện Thoại:
                </label>
                <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-2 rounded-lg">
                  {viewingUser.phoneNumber || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng Thái:
                </label>
                <span
                  className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                    viewingUser.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {viewingUser.status === "active" ? "Hoạt động" : "Ngừng"}
                </span>
              </div>
            </div>
            <div className="flex justify-end mt-4 sm:mt-6">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
                onClick={() => setViewingUser(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm người dùng */}
      {addingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-4xl shadow-2xl backdrop-blur-lg my-4">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                Thêm Người Dùng
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setAddingUser(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tên Đăng Nhập *
                </label>
                <input
                  type="text"
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={addForm.username}
                  onChange={(e) =>
                    setAddForm({ ...addForm, username: e.target.value })
                  }
                  required
                  disabled={createLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Họ và Tên *
                </label>
                <input
                  type="text"
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={addForm.fullname}
                  onChange={(e) =>
                    setAddForm({ ...addForm, fullname: e.target.value })
                  }
                  required
                  disabled={createLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  required
                  disabled={createLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mật Khẩu *
                </label>
                <input
                  type="password"
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm({ ...addForm, password: e.target.value })
                  }
                  required
                  disabled={createLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Địa Chỉ
                </label>
                <input
                  type="text"
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={addForm.address}
                  onChange={(e) =>
                    setAddForm({ ...addForm, address: e.target.value })
                  }
                  disabled={createLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={addForm.phoneNumber}
                  onChange={(e) =>
                    setAddForm({ ...addForm, phoneNumber: e.target.value })
                  }
                  disabled={createLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trạng Thái
                </label>
                <select
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={addForm.enabled ? "active" : "inactive"}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      enabled: e.target.value === "active",
                    })
                  }
                  disabled={createLoading}
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Ngừng</option>
                </select>
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
            )}
            <div className="flex flex-col sm:flex-row justify-end mt-6 gap-3">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
                onClick={() => setAddingUser(false)}
                disabled={createLoading}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
                onClick={handleCreate}
                disabled={createLoading}
              >
                {createLoading && (
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {createLoading ? "Đang thêm..." : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManager;
