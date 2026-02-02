import React from "react";
import { Loader } from "./loader";

const Spinner = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader size="lg" />
    </div>
  );
};

export default Spinner;
