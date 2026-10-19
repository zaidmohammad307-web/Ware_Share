import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";

import Header from "./Header";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import Spinner from "./Spinner";

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#333]">
      <ScrollToTop />

      {/* Branded Header */}
      <Header />

      {/* Page container */}
      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-6">
        {/* Pages load on demand; keep header/footer visible meanwhile */}
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Branded Footer */}
      <Footer />
    </div>
  );
};

export default Layout;
