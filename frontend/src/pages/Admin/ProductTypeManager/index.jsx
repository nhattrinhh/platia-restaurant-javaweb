import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { getProductTypes, createProductType, updateProductType, deleteProductType } from '../../../services/api/productTypeService';
import Swal from 'sweetalert2';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ProductTypeManager() {
    const [productTypes, setProductTypes] = useState([]);
    const [form, setForm] = useState({ name: '' });
    const [modalType, setModalType] = useState('add'); // 'add' | 'edit'
    const [selectedId, setSelectedId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    // Lấy danh sách loại sản phẩm từ backend
    useEffect(() => {
        const fetchProductTypes = async () => {
            if (!token) {
                setError('Vui lòng đăng nhập với vai trò ADMIN.');
                setLoading(false);
                return;
            }

            try {
                const productTypesData = await getProductTypes(token);
                setProductTypes(productTypesData);
                setError(null);
            } catch (err) {
                setError(err.message || 'Không thể tải dữ liệu.');
                toast.error(err.message || 'Không thể tải dữ liệu.', {
                    position: 'top-right',
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: 'light',
                });
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProductTypes();
    }, [token]);

    // Xử lý thay đổi form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Mở modal thêm/chỉnh sửa
    const handleOpenModal = (type, productType = null) => {
        setModalType(type);
        setSelectedId(productType?.id || null);
        setForm({ name: productType?.name || '' });
        setShowModal(true);
    };

    // Đóng modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedId(null);
        setForm({ name: '' });
        setError(null);
    };

    // Thêm hoặc chỉnh sửa loại sản phẩm
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || form.name.trim() === '') {
            setError('Tên loại món ăn không được để trống.');
            return;
        }

        // Xác nhận lưu với SweetAlert2
        const confirmResult = await Swal.fire({
            title: modalType === 'add' ? 'Xác nhận thêm loại món ăn' : 'Xác nhận chỉnh sửa loại món ăn',
            text: `Bạn có chắc chắn muốn ${modalType === 'add' ? 'thêm' : 'lưu thay đổi cho'} loại món ăn này?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4F46E5', // Indigo-600
            cancelButtonColor: '#6B7280', // Gray-500
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy',
        });

        if (!confirmResult.isConfirmed) return;

        try {
            if (modalType === 'add') {
                const newProductType = await createProductType(token, { name: form.name });
                setProductTypes([...productTypes, newProductType]);
                toast.success('Thêm loại món ăn thành công!', {
                    position: 'top-right',
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: 'light',
                });
            } else if (modalType === 'edit' && selectedId) {
                const updatedProductType = await updateProductType(token, selectedId, { name: form.name });
                setProductTypes(productTypes.map(pt => (pt.id === selectedId ? updatedProductType : pt)));
                toast.success('Cập nhật loại món ăn thành công!', {
                    position: 'top-right',
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: 'light',
                });
            }
            handleCloseModal();
        } catch (err) {
            setError(err.message || 'Không thể lưu loại món ăn.');
            toast.error(err.message || 'Không thể lưu loại món ăn.', {
                position: 'top-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: 'light',
            });
            console.error(err);
        }
    };

    // Xóa loại sản phẩm
    const handleDelete = async (id) => {
        if (!token) {
            setError('Vui lòng đăng nhập để thực hiện hành động này.');
            return;
        }

        const confirmResult = await Swal.fire({
            title: 'Xác nhận xóa loại món ăn',
            text: 'Bạn có chắc chắn muốn xóa loại món ăn này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444', // Red-500
            cancelButtonColor: '#6B7280', // Gray-500
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });

        if (!confirmResult.isConfirmed) return;

        try {
            await deleteProductType(token, id);
            setProductTypes(productTypes.filter(pt => pt.id !== id));
            toast.success('Xóa loại món ăn thành công!', {
                position: 'top-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: 'light',
            });
            setError(null);
        } catch (err) {
            setError(err.message || 'Không thể xóa loại món ăn.');
            toast.error(err.message || 'Không thể xóa loại món ăn.', {
                position: 'top-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: 'light',
            });
            console.error(err);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-600">Đang tải...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <ToastContainer />
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-extrabold text-indigo-900 tracking-tight">Quản lý Loại Món Ăn</h2>
                    <button
                        onClick={() => handleOpenModal('add')}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-300"
                    >
                        <FaPlus className="mr-2" /> Thêm loại món ăn
                    </button>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-indigo-100 text-indigo-900">
                                    <th className="p-4 text-left font-semibold">#</th>
                                    <th className="p-4 text-left font-semibold">Tên loại món ăn</th>
                                    <th className="p-4 text-left font-semibold">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="text-center text-gray-500 py-6">
                                            Không có loại món ăn nào
                                        </td>
                                    </tr>
                                ) : (
                                    productTypes.map((pt, index) => (
                                        <tr key={pt.id} className="hover:bg-gray-50 transition-all duration-200">
                                            <td className="p-4 border-t border-gray-200">{index + 1}</td>
                                            <td className="p-4 border-t border-gray-200">{pt.name}</td>
                                            <td className="p-4 border-t border-gray-200 flex space-x-3">
                                                <button
                                                    onClick={() => handleOpenModal('edit', pt)}
                                                    className="p-2 bg-indigo-500 text-white rounded-full shadow-sm hover:bg-indigo-600 transition-all duration-200"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(pt.id)}
                                                    className="p-2 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition-all duration-200"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl backdrop-blur-lg">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6">
                                {modalType === 'add' ? 'Thêm loại món ăn' : 'Chỉnh sửa loại món ăn'}
                            </h3>
                            {error && <div className="text-red-500 mb-4 text-center bg-red-50 p-3 rounded-lg">{error}</div>}
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên loại món ăn *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        required
                                        placeholder="Nhập tên loại món ăn"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200"
                                    >
                                        {modalType === 'add' ? 'Thêm mới' : 'Lưu thay đổi'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProductTypeManager;