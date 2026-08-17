"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import type { TrackerRecord } from "@/types/tracker";
import { TrackerCard } from "@/components/TrackerCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "swiper/css";

type TrackerCarouselProps = {
  trackers: TrackerRecord[];
  getTrackerRunningState: (
    trackerId: string,
  ) => { id: string } | null;
  onReorder: (newOrder: TrackerRecord[]) => void;
  onToggle: (tracker: TrackerRecord) => void;
  onRun: (tracker: TrackerRecord) => void;
  onEdit: (tracker: TrackerRecord) => void;
  onDelete: (tracker: TrackerRecord) => void;
};

function useCarouselNavigation() {
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);

  function updateNavigationState(instance: SwiperType) {
    setCanScrollBack(!instance.isBeginning);
    setCanScrollForward(!instance.isEnd);
    setShowNavigation(!instance.isLocked);
  }

  return {
    canScrollBack,
    canScrollForward,
    showNavigation,
    updateNavigationState,
  };
}

export function TrackerCarousel({
  trackers,
  getTrackerRunningState,
  onReorder,
  onToggle,
  onRun,
  onEdit,
  onDelete,
}: TrackerCarouselProps) {
  const { t } = useI18n();
  const {
    canScrollBack,
    canScrollForward,
    showNavigation,
    updateNavigationState,
  } = useCarouselNavigation();
  const [swiper, setSwiper] = useState<SwiperType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    swiper?.update();
  }, [swiper, trackers]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = trackers.findIndex((tracker) => tracker.id === active.id);
    const newIndex = trackers.findIndex((tracker) => tracker.id === over.id);
    onReorder(arrayMove(trackers, oldIndex, newIndex));
  }

  return (
    <div className="relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={trackers.map((tracker) => tracker.id)}
          strategy={horizontalListSortingStrategy}
        >
          <Swiper
            spaceBetween={16}
            slidesPerView="auto"
            grabCursor={false}
            watchOverflow
            onSwiper={(instance) => {
              setSwiper(instance);
              updateNavigationState(instance);
            }}
            onSlideChange={updateNavigationState}
            onResize={updateNavigationState}
            className="tracker-swiper"
          >
            {trackers.map((tracker) => (
              <SwiperSlide key={tracker.id} className="tracker-swiper-slide">
                <TrackerCard
                  tracker={tracker}
                  runningState={getTrackerRunningState(tracker.id)}
                  onToggle={onToggle}
                  onRun={onRun}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </SortableContext>
      </DndContext>

      {showNavigation && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("h-8 w-8", !canScrollBack && "opacity-40")}
            disabled={!canScrollBack}
            aria-label={t("dashboard.trackers.previousTrackers")}
            onClick={() => swiper?.slidePrev()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("h-8 w-8", !canScrollForward && "opacity-40")}
            disabled={!canScrollForward}
            aria-label={t("dashboard.trackers.nextTrackers")}
            onClick={() => swiper?.slideNext()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
