import React from "react";
import { Outlet } from "react-router-dom";

import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#333]">
      {/* Branded Header */}
      <Header />

      {/* Page container */}
      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-6">
        <Outlet />
      </main>

      {/* Branded Footer */}
      <Footer />
    </div>
  );
};

export default Layout;
