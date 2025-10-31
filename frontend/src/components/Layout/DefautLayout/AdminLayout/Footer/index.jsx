import React from 'react';

function Footer() {
    return (
        <footer
            className="admin-footer bg-gray-100 border-t h-12 flex items-center justify-center mt-auto text-sm text-gray-500"
        >
            <span>
                © {new Date().getFullYear()} FoobieHub Admin | Powered by{' '}
                <span className="text-blue-600 font-semibold">FoodieHub Team</span>
            </span>
        </footer>

    );
}

export default Footer;