import { useEffect, useState } from 'react';
import { FaSearch, FaEye, FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import { getProducts, getProductTypes, getCategories, searchProducts, createProduct, updateProduct, deleteProduct } from '../../../services/api/productService';
import Swal from 'sweetalert2';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ProductManager() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('add'); // 'add' | 'edit'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productTypes, setProductTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        name: '',
        description: '',
        originalPrice: '',
        discountedPrice: '',
        img: '',
        productTypeId: '',
        productTypeName: '',
        status: 'AVAILABLE',
        categoryId: '',
        categoryName: '',
    });
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageToShow, setImageToShow] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 7; // 7 records per page

    const token = localStorage.getItem('token');
    const baseImagePath = 'http://localhost:5173/images/Product/';

    // Lấy danh sách sản phẩm, loại sản phẩm và danh mục từ backend
    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                setError('Vui lòng đăng nhập với vai trò ADMIN.');
                setLoading(false);
                return;
            }

            try {
                // Lấy danh sách sản phẩm
                const productsData = await getProducts();
                const enrichedProducts = productsData.map(product => ({
                    id: product.id,
                    name: product.name,
                    description: product.description || '',
                    originalPrice: product.originalPrice,
                    discountedPrice: product.discountedPrice || 0,
                    img: product.img || '/images/Product/placeholder.jpg',
                    discount: calculateDiscount(product.originalPrice, product.discountedPrice || 0),
                    productTypeId: product.productTypeId,
                    productTypeName: product.productTypeName || '',
                    status: product.status || 'AVAILABLE',
                    categoryId: product.categoryId,
                    categoryName: product.categoryName || '',
                }));
                setProducts(enrichedProducts);

                // Lấy danh sách productTypes
                const productTypesData = await getProductTypes();
                setProductTypes(productTypesData);

                // Lấy danh sách categories
                const categoriesData = await getCategories();
                setCategories(categoriesData);

                setError(null);
            } catch (err) {
                setError(err.message || 'Không thể tải dữ liệu.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    // Tính toán discount
    const calculateDiscount = (originalPrice, discountedPrice) => {
        if (!originalPrice || !discountedPrice || originalPrice <= 0) return 'Giảm 0%';
        const discountPercent = ((originalPrice - discountedPrice) / originalPrice * 100).toFixed(0);
        return `Giảm ${discountPercent}%`;
    };

    // Mở modal thêm/chỉnh sửa
    const handleOpenModal = (type, product = null) => {
        setModalType(type);
        setSelectedProduct(product);
        if (type === 'edit' && product) {
            setForm({
                name: product.name,
                description: product.description || '',
                originalPrice: product.originalPrice,
                discountedPrice: product.discountedPrice,
                img: product.img && product.img.startsWith(baseImagePath) ? product.img.replace(baseImagePath, '') : product.img,
                productTypeId: product.productTypeId || '',
                productTypeName: product.productTypeName || '',
                status: product.status || 'AVAILABLE',
                categoryId: product.categoryId || '',
                categoryName: product.categoryName || '',
            });
        } else {
            setForm({
                name: '',
                description: '',
                originalPrice: '',
                discountedPrice: '',
                img: '',
                productTypeId: '',
                productTypeName: '',
                status: 'AVAILABLE',
                categoryId: '',
                categoryName: '',
            });
        }
        setShowModal(true);
    };

    // Đóng modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedProduct(null);
        setError(null);
    };

    // Xử lý thay đổi form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === 'originalPrice' || name === 'discountedPrice' ? parseFloat(value) || '' : value,
            ...(name === 'productTypeId' && {
                productTypeName: productTypes.find(pt => pt.id === parseInt(value))?.name || ''
            }),
            ...(name === 'categoryId' && {
                categoryName: categories.find(cat => cat.id === parseInt(value))?.name || ''
            }),
        }));
    };

    // Mở modal xem ảnh lớn
    const handleShowImage = (img) => {
        setImageToShow(img || '/images/Product/placeholder.jpg');
        setShowImageModal(true);
    };

    // Đóng modal xem ảnh
    const handleCloseImageModal = () => {
        setShowImageModal(false);
        setImageToShow(null);
    };

    // Thêm hoặc chỉnh sửa sản phẩm
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.originalPrice || !form.productTypeId || !form.status) {
            setError('Vui lòng nhập đầy đủ thông tin bắt buộc (tên, giá gốc, loại món ăn, trạng thái).');
            return;
        }
        const originalPrice = parseFloat(form.originalPrice);
        const discountedPrice = parseFloat(form.discountedPrice) || 0;
        if (originalPrice < 0 || discountedPrice < 0) {
            setError('Giá phải là số dương.');
            return;
        }
        if (discountedPrice > originalPrice) {
            setError('Giá khuyến mãi không được lớn hơn giá gốc.');
            return;
        }
        const imageUrl = form.img ? (form.img.startsWith('http') ? form.img : `${baseImagePath}${form.img}`) : null;
        if (imageUrl && imageUrl.startsWith('http') && !isValidUrl(imageUrl)) {
            setError('URL hình ảnh không hợp lệ.');
            return;
        }
        if (imageUrl && !imageUrl.startsWith('http') && !form.img.match(/\.(jpg|jpeg|png|gif)$/i)) {
            setError('Tên tệp hình ảnh phải có đuôi .jpg, .jpeg, .png hoặc .gif.');
            return;
        }

        // Xác nhận lưu với SweetAlert2
        const confirmResult = await Swal.fire({
            title: modalType === 'add' ? 'Xác nhận thêm sản phẩm' : 'Xác nhận chỉnh sửa sản phẩm',
            text: `Bạn có chắc chắn muốn ${modalType === 'add' ? 'thêm' : 'lưu thay đổi cho'} sản phẩm này?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4F46E5', // Indigo-600
            cancelButtonColor: '#6B7280', // Gray-500
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy',
        });

        if (!confirmResult.isConfirmed) return;

        try {
            const payload = {
                name: form.name,
                description: form.description || null,
                originalPrice,
                discountedPrice,
                discount: ((originalPrice - discountedPrice) / originalPrice * 100).toFixed(2),
                productTypeId: parseInt(form.productTypeId),
                productTypeName: form.productTypeName || null,
                img: imageUrl,
                status: form.status,
                categoryId: form.categoryId ? parseInt(form.categoryId) : null,
                categoryName: form.categoryName || null,
            };

            if (modalType === 'add') {
                const newProduct = await createProduct(token, payload);
                setProducts([...products, {
                    id: newProduct.id,
                    name: newProduct.name,
                    description: newProduct.description || '',
                    originalPrice: newProduct.originalPrice,
                    discountedPrice: newProduct.discountedPrice || 0,
                    img: newProduct.img || '/images/Product/placeholder.jpg',
                    discount: calculateDiscount(newProduct.originalPrice, newProduct.discountedPrice || 0),
                    productTypeId: newProduct.productTypeId,
                    productTypeName: newProduct.productTypeName || '',
                    status: newProduct.status || 'AVAILABLE',
                    categoryId: newProduct.categoryId,
                    categoryName: newProduct.categoryName || '',
                }]);
                toast.success('Thêm món ăn thành công!', {
                    position: 'top-right',
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: 'light',
                });
            } else if (modalType === 'edit' && selectedProduct) {
                const updatedProduct = await updateProduct(token, selectedProduct.id, payload);
                setProducts(products.map(p =>
                    p.id === selectedProduct.id ? {
                        ...p,
                        name: updatedProduct.name,
                        description: updatedProduct.description || '',
                        originalPrice: updatedProduct.originalPrice,
                        discountedPrice: updatedProduct.discountedPrice || 0,
                        img: updatedProduct.img || '/images/Product/placeholder.jpg',
                        discount: calculateDiscount(updatedProduct.originalPrice, updatedProduct.discountedPrice || 0),
                        productTypeId: updatedProduct.productTypeId,
                        productTypeName: updatedProduct.productTypeName || '',
                        status: updatedProduct.status || 'AVAILABLE',
                        categoryId: updatedProduct.categoryId,
                        categoryName: updatedProduct.categoryName || '',
                    } : p
                ));
                toast.success('Cập nhật món ăn thành công!', {
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
            setCurrentPage(1); // Reset to first page after adding/editing
        } catch (err) {
            setError(err.message || 'Không thể lưu món ăn.');
            toast.error(err.message || 'Không thể lưu món ăn.', {
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

    // Xóa sản phẩm
    const handleDelete = async (id) => {
        if (!token) {
            setError('Vui lòng đăng nhập để thực hiện hành động này.');
            return;
        }

        const confirmResult = await Swal.fire({
            title: 'Xác nhận xóa món ăn',
            text: 'Bạn có chắc chắn muốn xóa món ăn này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444', // Red-500
            cancelButtonColor: '#6B7280', // Gray-500
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });

        if (!confirmResult.isConfirmed) return;

        try {
            await deleteProduct(token, id);
            setProducts(products.filter(p => p.id !== id));
            toast.success('Xóa món ăn thành công!', {
                position: 'top-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: 'light',
            });
            setError(null);
            // Adjust current page if necessary
            if (currentProducts.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
        } catch (err) {
            setError(err.message || 'Không thể xóa món ăn.');
            toast.error(err.message || 'Không thể xóa món ăn.', {
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

    // Tìm kiếm sản phẩm theo tên
    const handleSearch = async () => {
        if (!token) {
            setError('Vui lòng đăng nhập để thực hiện tìm kiếm.');
            return;
        }

        try {
            const productsData = await searchProducts(token, search);
            const enrichedProducts = productsData.map(product => ({
                id: product.id,
                name: product.name,
                description: product.description || '',
                originalPrice: product.originalPrice,
                discountedPrice: product.discountedPrice || 0,
                img: product.img || '/images/Product/placeholder.jpg',
                discount: calculateDiscount(product.originalPrice, product.discountedPrice || 0),
                productTypeId: product.productTypeId,
                productTypeName: product.productTypeName || '',
                status: product.status || 'AVAILABLE',
                categoryId: product.categoryId,
                categoryName: product.categoryName || '',
            }));
            setProducts(enrichedProducts);
            setError(null);
            toast.success('Tìm kiếm món ăn thành công!', {
                position: 'top-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: 'light',
            });
            setCurrentPage(1); // Reset to first page after search
        } catch (err) {
            setError(err.message || 'Không thể tìm kiếm món ăn.');
            toast.error(err.message || 'Không thể tìm kiếm món ăn.', {
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

    // Xóa bộ lọc tìm kiếm và tải lại danh sách sản phẩm
    const handleClearFilter = async () => {
        setSearch('');
        if (!token) {
            setError('Vui lòng đăng nhập để thực hiện hành động này.');
            return;
        }

        try {
            const productsData = await getProducts();
            const enrichedProducts = productsData.map(product => ({
                id: product.id,
                name: product.name,
                description: product.description || '',
                originalPrice: product.originalPrice,
                discountedPrice: product.discountedPrice || 0,
                img: product.img || '/images/Product/placeholder.jpg',
                discount: calculateDiscount(product.originalPrice, product.discountedPrice || 0),
                productTypeId: product.productTypeId,
                productTypeName: product.productTypeName || '',
                status: product.status || 'AVAILABLE',
                categoryId: product.categoryId,
                categoryName: product.categoryName || '',
            }));
            setProducts(enrichedProducts);
            setError(null);
            toast.success('Đã xóa bộ lọc và tải lại danh sách món ăn', {
                position: 'top-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: 'light',
            });
            setCurrentPage(1); // Reset to first page after clearing filter
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách món ăn.');
            toast.error(err.message || 'Không thể tải danh sách món ăn.', {
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

    // Kiểm tra URL hợp lệ
    const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    };

    // Pagination logic
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(products.length / productsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-600">Đang tải...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <ToastContainer />
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-3xl font-extrabold text-indigo-900 tracking-tight">Quản lý Thực Đơn</h2>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Tìm kiếm theo tên món ăn..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        {search && (
                            <FaTimes
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer hover:text-red-500"
                                onClick={handleClearFilter}
                            />
                        )}
                    </div>
                    <button
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-300"
                        onClick={() => handleOpenModal('add')}
                    >
                        <FaPlus className="mr-2" /> Thêm món ăn
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-indigo-100 text-indigo-900">
                                <th className="p-4 text-left font-semibold">#</th>
                                <th className="p-4 text-left font-semibold">Hình ảnh</th>
                                <th className="p-4 text-left font-semibold">Tên món ăn</th>
                                <th className="p-4 text-left font-semibold">Loại món ăn</th>
                                <th className="p-4 text-left font-semibold">Danh mục món ăn</th>
                                <th className="p-4 text-left font-semibold">Giá gốc</th>
                                <th className="p-4 text-left font-semibold">Giá khuyến mãi</th>
                                <th className="p-4 text-left font-semibold">Giảm giá</th>
                                <th className="p-4 text-left font-semibold">Trạng thái</th>
                                <th className="p-4 text-left font-semibold">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center text-gray-500 py-6">
                                        Không có món ăn phù hợp
                                    </td>
                                </tr>
                            ) : (
                                currentProducts.map((p, idx) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-all duration-200">
                                        <td className="p-4 border-t border-gray-200">{idx + 1 + (currentPage - 1) * productsPerPage}</td>
                                        <td className="p-4 border-t border-gray-200">
                                            <img
                                                src={p.img}
                                                alt={p.name}
                                                className="w-12 h-12 object-cover rounded cursor-pointer"
                                                onError={(e) => { e.target.src = '/images/Product/placeholder.jpg'; }}
                                                onClick={() => handleShowImage(p.img)}
                                            />
                                        </td>
                                        <td className="p-4 border-t border-gray-200">{p.name}</td>
                                        <td className="p-4 border-t border-gray-200">{p.productTypeName || 'Không có'}</td>
                                        <td className="p-4 border-t border-gray-200">{p.categoryName || 'Không có'}</td>
                                        <td className="p-4 border-t border-gray-200">{p.originalPrice.toLocaleString('vi-VN')} VNĐ</td>
                                        <td className="p-4 border-t border-gray-200">{p.discountedPrice.toLocaleString('vi-VN')} VNĐ</td>
                                        <td className="p-4 border-t border-gray-200">{p.discount}</td>
                                        <td className="p-4 border-t border-gray-200">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${p.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                                    p.status === 'OUT_OF_STOCK' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {p.status === 'AVAILABLE' ? 'Có sẵn' :
                                                    p.status === 'OUT_OF_STOCK' ? 'Hết hàng' : 'Ngừng kinh doanh'}
                                            </span>
                                        </td>
                                        <td className="p-4 border-t border-gray-200 flex space-x-3">
                                            <button
                                                className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-all duration-200"
                                                onClick={() => handleOpenModal('edit', p)}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200"
                                                onClick={() => handleDelete(p.id)}
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
                {/* Pagination */}
                {products.length > productsPerPage && (
                    <div className="flex justify-center items-center gap-2 py-4">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                        >
                            Previous
                        </button>
                        {[...Array(totalPages).keys()].map((page) => (
                            <button
                                key={page + 1}
                                onClick={() => handlePageChange(page + 1)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium ${currentPage === page + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                {page + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Modal xem ảnh lớn */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="relative max-w-4xl w-full">
                        <img
                            src={imageToShow}
                            alt="Product"
                            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                            onError={(e) => { e.target.src = '/images/Product/placeholder.jpg'; }}
                        />
                        <button
                            className="absolute top-4 right-4 text-white text-2xl font-bold bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition-all duration-200"
                            onClick={handleCloseImageModal}
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal thêm/chỉnh sửa */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 w-full max-w-4xl shadow-2xl backdrop-blur-lg">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">{modalType === 'add' ? 'Thêm sản phẩm' : 'Chỉnh sửa sản phẩm'}</h3>
                        {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tên món ăn *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Nhập tên món ăn"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Giá gốc *</label>
                                    <input
                                        type="number"
                                        name="originalPrice"
                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={form.originalPrice}
                                        onChange={handleChange}
                                        required
                                        placeholder="Nhập giá gốc"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Giá khuyến mãi</label>
                                    <input
                                        type="number"
                                        name="discountedPrice"
                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={form.discountedPrice}
                                        onChange={handleChange}
                                        placeholder="Nhập giá khuyến mãi"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Loại món ăn *</label>
                                    <select
                                        name="productTypeId"
                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={form.productTypeId}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Chọn loại món ăn</option>
                                        {productTypes.map(pt => (
                                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Trạng thái *</label>
                                    <select
                                        name="status"
                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={form.status}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="AVAILABLE">Có sẵn</option>
                                        <option value="OUT_OF_STOCK">Hết hàng</option>
                                        <option value="DISCONTINUED">Ngừng kinh doanh</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Danh mục món ăn</label>
                                    <select
                                        name="categoryId"
                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={form.categoryId}
                                        onChange={handleChange}
                                    >
                                        <option value="">Không có</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                                    <input
                                        type="text"
                                        name="img"
                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={form.img}
                                        onChange={handleChange}
                                        placeholder="Nhập tên tệp hoặc URL"
                                    />
                                    {form.img && (
                                        <img
                                            src={form.img.startsWith('http') ? form.img : `${baseImagePath}${form.img}`}
                                            alt="Preview"
                                            className="w-20 h-20 object-cover mt-2 rounded"
                                            onError={(e) => { e.target.src = '/images/Product/placeholder.jpg'; }}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                                <textarea
                                    name="description"
                                    className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Nhập mô tả sản phẩm"
                                    rows="4"
                                />
                            </div>
                            <div className="flex justify-end mt-6 space-x-3">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                                    onClick={handleCloseModal}
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
    );
}

export default ProductManager;