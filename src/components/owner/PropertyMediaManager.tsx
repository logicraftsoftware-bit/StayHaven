"use client";

/* Cloudinary media previews require native media elements. */
/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";

type Room = { id: string; name: string };
type Media = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  roomId?: string;
  category: string;
  tags?: string[];
  caption: string;
  primary: boolean;
  sortOrder: number;
};

const tags = [
  "Bathtub",
  "Jacuzzi",
  "Toiletries",
  "Washroom",
  "Balcony",
  "Bed",
  "Dining",
  "Dining Area",
  "Kitchenette",
  "Living Area",
  "Lobby/Common Area",
  "Outside View",
  "Play Area",
  "Private Pool",
  "Room",
  "Study Area",
  "View",
  "Bar",
  "Barbeque",
  "Bonfire",
  "Camp Site",
  "Restaurant/cafe",
  "Beverage Menu",
  "Food Menu",
  "Driver Room",
  "Kitchen",
  "Lounge",
  "Parking",
  "Activities & Experiences",
  "Banquet",
  "Club house",
  "Conference Room",
  "Elevator",
  "Entrance",
  "Facade",
  "Garden",
  "Golf Court",
  "Gym",
  "Menu",
  "Others",
  "Reception",
  "Registration Certificate",
  "Signature Amenity",
  "Spa",
  "Swimming Pool",
  "Terrace",
  "Food",
];

export function PropertyMediaManager({
  media,
  rooms,
  upload,
  setMedia,
}: {
  media: Media[];
  rooms: Room[];
  upload: (file: File, roomId?: string) => Promise<Media>;
  setMedia: (media: Media[]) => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadRoomId, setUploadRoomId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [roomPickerId, setRoomPickerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagListOpen, setTagListOpen] = useState(false);
  const cover = media.find(
    (item) => item.primary && item.mediaType === "image",
  );
  const active = media.find((item) => item.id === editorId);
  const update = (id: string, patch: Partial<Media>) =>
    setMedia(
      media.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const openEditor = (id: string) => {
    setEditorId(id);
    setSearch("");
    setTagListOpen(false);
  };
  const uploadMany = async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => upload(file, uploadRoomId)),
      );
      const hasCover = media.some((item) => item.primary);
      const firstImage = uploaded.findIndex(
        (item) => item.mediaType === "image",
      );
      const next = [
        ...media,
        ...uploaded.map((item, index) => ({
          ...item,
          primary: !hasCover && index === firstImage,
          sortOrder: media.length + index,
        })),
      ];
      setMedia(next);
      setUploadOpen(false);
      setEditorId(uploaded[0]?.id || null);
    } finally {
      setUploading(false);
    }
  };
  const tagged = media.filter((item) => item.tags?.length);
  const untagged = media.filter((item) => !item.tags?.length);

  return (
    <div className="property-media-summary">
      <header className="property-media-heading">
        <div>
          <h2>Photos & Videos ({media.length})</h2>
          <p>Tag every item and assign photos to the correct spaces.</p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => {
            setUploadRoomId("");
            setUploadOpen(true);
          }}
        >
          <ImagePlus /> Upload Photos & Videos
        </button>
      </header>
      {cover && (
        <button
          type="button"
          className="property-cover-preview"
          onClick={() => openEditor(cover.id)}
        >
          <img src={cover.url} alt="Property cover" />
          <span>
            Property cover photo {cover.tags?.[0] ? `(${cover.tags[0]})` : ""}
          </span>
        </button>
      )}

      <section
        className={`media-summary-section untagged ${untagged.length ? "visible" : ""}`}
      >
        <h3>Untagged Photos & Videos ({untagged.length})</h3>
        <p>
          Click an item to add tags. Tagged media helps guests understand your
          property.
        </p>
        <div className="media-summary-thumbnails">
          {untagged.map((item) => (
            <MediaThumb
              key={item.id}
              item={item}
              label="TAG MISSING"
              onClick={() => openEditor(item.id)}
            />
          ))}
        </div>
      </section>

      <section className="media-summary-section">
        <h3>Photos & Videos assigned to the spaces</h3>
        <p>Every room needs at least one assigned photo.</p>
        <div className="space-media-cards">
          {rooms.map((room) => {
            const assigned = media.filter(
              (item) => item.roomId === room.id && item.mediaType === "image",
            );
            return (
              <article
                className={assigned.length ? "complete" : "missing"}
                key={room.id}
              >
                {assigned[0] ? (
                  <button
                    type="button"
                    onClick={() => openEditor(assigned[0].id)}
                  >
                    <img src={assigned[0].url} alt="" />
                  </button>
                ) : (
                  <ImagePlus />
                )}
                <b>{room.name || "Unnamed room"}</b>
                <small>
                  {assigned.length
                    ? `${assigned.length} photo${assigned.length > 1 ? "s" : ""}`
                    : "Photo required"}
                </small>
                <button type="button" onClick={() => setRoomPickerId(room.id)}>
                  <Plus /> Add
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="media-summary-section">
        <h3>Photos & Videos tagged</h3>
        <div className="media-summary-thumbnails">
          {tagged.map((item) => (
            <MediaThumb
              key={item.id}
              item={item}
              label={(item.tags || []).join(", ")}
              onClick={() => openEditor(item.id)}
            />
          ))}
        </div>
      </section>

      {uploadOpen && (
        <div className="media-upload-scrim">
          <section className="media-upload-modal">
            <header>
              <h2>Upload Photos & Videos</h2>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
              >
                <X />
              </button>
            </header>
            <div className="media-upload-modal-body">
              <div
                className="media-upload media-drop-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!uploading) void uploadMany(event.dataTransfer.files);
                }}
              >
                <ImagePlus />
                <b>Drag & drop photos and videos</b>
                <p>or select multiple files from your device</p>
                <select
                  value={uploadRoomId}
                  onChange={(event) => setUploadRoomId(event.target.value)}
                >
                  <option value="">Entire property</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name || "Unnamed room"}
                    </option>
                  ))}
                </select>
                <label className="media-file-button">
                  {uploading ? "Uploading..." : "Choose files"}
                  <input
                    type="file"
                    multiple
                    disabled={uploading}
                    accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                    onChange={(event) =>
                      event.target.files && void uploadMany(event.target.files)
                    }
                  />
                </label>
              </div>
              <aside>
                <h3>Photo resolution rules</h3>
                <ul>
                  <li>JPG, PNG or WEBP, maximum 5 MB each.</li>
                  <li>MP4 or WEBM, maximum 25 MB each.</li>
                  <li>Use landscape photos, ideally 1920 × 1080 px.</li>
                  <li>Minimum recommended resolution: 1024 × 683 px.</li>
                  <li>Use bright, clear images without watermarks.</li>
                  <li>Include at least one photo for every room.</li>
                </ul>
              </aside>
            </div>
          </section>
        </div>
      )}

      {active && (
        <div className="media-editor-scrim">
          <section className="media-editor-modal">
            <header>
              <div>
                <h2>Add tags to uploaded media</h2>
                <p>
                  Select an image, add tags, assign its space and choose a
                  cover.
                </p>
              </div>
              <button type="button" onClick={() => setEditorId(null)}>
                <X />
              </button>
            </header>
            <div className="media-editor-body">
              <aside>
                {media.map((item) => (
                  <button
                    type="button"
                    className={item.id === active.id ? "active" : ""}
                    key={item.id}
                    onClick={() => openEditor(item.id)}
                  >
                    {item.mediaType === "image" ? (
                      <img src={item.url} alt="" />
                    ) : (
                      <video src={item.url} />
                    )}
                  </button>
                ))}
              </aside>
              <div className="media-editor-preview">
                {active.mediaType === "image" ? (
                  <img src={active.url} alt="" />
                ) : (
                  <video src={active.url} controls />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMedia(media.filter((item) => item.id !== active.id));
                    setEditorId(null);
                  }}
                >
                  <Trash2 />
                </button>
                {active.mediaType === "image" && (
                  <label>
                    <input
                      type="radio"
                      name="property-cover-editor"
                      checked={active.primary}
                      onChange={() =>
                        setMedia(
                          media.map((item) => ({
                            ...item,
                            primary: item.id === active.id,
                          })),
                        )
                      }
                    />{" "}
                    Set as property cover photo
                  </label>
                )}
              </div>
              <div className="media-editor-controls">
                <label>
                  Photo & Video assigned to
                  <select
                    value={active.roomId || ""}
                    onChange={(event) =>
                      update(active.id, {
                        roomId: event.target.value || undefined,
                        category: event.target.value ? "Room" : "Property",
                      })
                    }
                  >
                    <option value="">Entire property</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name || "Unnamed room"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Selected tags
                  <div className="media-tag-combobox">
                    <div>
                      {(active.tags || []).map((tag) => (
                        <button
                          type="button"
                          key={tag}
                          onClick={() =>
                            update(active.id, {
                              tags: (active.tags || []).filter(
                                (value) => value !== tag,
                              ),
                            })
                          }
                        >
                          {tag}
                          <X />
                        </button>
                      ))}
                      <Search />
                      <input
                        placeholder="Search tags"
                        value={search}
                        onFocus={() => setTagListOpen(true)}
                        onClick={() => setTagListOpen(true)}
                        onChange={(event) => {
                          setSearch(event.target.value);
                          setTagListOpen(true);
                        }}
                      />
                    </div>
                    {tagListOpen && (
                      <div className="media-tag-menu">
                        {tags
                          .filter((tag) =>
                            tag.toLowerCase().includes(search.toLowerCase()),
                          )
                          .map((tag) => (
                            <label key={tag}>
                              <input
                                type="checkbox"
                                checked={(active.tags || []).includes(tag)}
                                onChange={() =>
                                  update(active.id, {
                                    tags: (active.tags || []).includes(tag)
                                      ? (active.tags || []).filter(
                                          (value) => value !== tag,
                                        )
                                      : [...(active.tags || []), tag],
                                  })
                                }
                              />
                              <span>{tag}</span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
            <footer>
              <span>
                {media.filter((item) => !item.tags?.length).length} untagged
                item(s) remaining
              </span>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setEditorId(null)}
              >
                Save tags
              </button>
            </footer>
          </section>
        </div>
      )}

      {roomPickerId && (
        <div className="media-editor-scrim">
          <section className="room-photo-picker">
            <header>
              <div>
                <h2>
                  Add photo to{" "}
                  {rooms.find((room) => room.id === roomPickerId)?.name ||
                    "room"}
                </h2>
                <p>Choose an uploaded photo or upload a new one.</p>
              </div>
              <button type="button" onClick={() => setRoomPickerId(null)}>
                <X />
              </button>
            </header>
            <div className="room-photo-picker-grid">
              {media
                .filter((item) => item.mediaType === "image")
                .map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      update(item.id, {
                        roomId: roomPickerId,
                        category: "Room",
                      });
                      setRoomPickerId(null);
                    }}
                  >
                    <img src={item.url} alt="" />
                    <span>
                      {item.roomId === roomPickerId
                        ? "Assigned"
                        : "Use this photo"}
                    </span>
                  </button>
                ))}
            </div>
            <footer>
              <button
                type="button"
                onClick={() => {
                  setUploadRoomId(roomPickerId);
                  setRoomPickerId(null);
                  setUploadOpen(true);
                }}
              >
                <ImagePlus /> Upload new photo
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function MediaThumb({
  item,
  label,
  onClick,
}: {
  item: Media;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}>
      {item.mediaType === "image" ? (
        <img src={item.url} alt="" />
      ) : (
        <video src={item.url} />
      )}
      <span>{label}</span>
    </button>
  );
}
