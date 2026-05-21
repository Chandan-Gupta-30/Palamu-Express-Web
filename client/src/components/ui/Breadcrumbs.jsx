import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export const Breadcrumbs = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex py-2.5 text-slate-500" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2 flex-wrap">
        {/* Home Item */}
        <li className="inline-flex items-center">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <Home className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
            Home
          </Link>
        </li>
        
        {/* Iterated Items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="inline-flex items-center">
              <ChevronRight className="mx-1 h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
              {isLast ? (
                <span className="text-xs font-medium text-orange-400 truncate max-w-[180px] sm:max-w-[360px] md:max-w-[500px]" title={item.label}>
                  {item.label}
                </span>
              ) : item.to ? (
                <Link
                  to={item.to}
                  className="text-xs font-medium text-slate-400 hover:text-white transition-colors capitalize"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-xs font-medium text-slate-400 capitalize">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
