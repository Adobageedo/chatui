"use client";

import React from "react";
import { useFileManagerStore } from "../../lib/files/store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";

export function FileBreadcrumbs() {
  const { getBreadcrumbs, navigateTo, selectedIds, getCurrentChildren } =
    useFileManagerStore();

  const crumbs = getBreadcrumbs();
  const items = getCurrentChildren();

  if (crumbs.length === 0) return null;

  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id ?? "root"}>
              {idx > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {idx === crumbs.length - 1 ? (
                  <span className="font-medium text-foreground">
                    {crumb.name}
                  </span>
                ) : (
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() => crumb.id && navigateTo(crumb.id)}
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedIds.size} selected
          </Badge>
        )}
        <span>{items.length} items</span>
      </div>
    </div>
  );
}
