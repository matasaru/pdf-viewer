(ns pdf.viewer
  (:require [ring.adapter.jetty :as jetty]
            [ring.middleware.defaults :refer [wrap-defaults site-defaults]]
            [ring.middleware.multipart-params :refer [wrap-multipart-params]]
            [ring.util.response :as resp]
            [reitit.ring :as reitit-ring]
            [hiccup.page :refer [html5 include-css include-js]])
  (:gen-class))

(defn viewer-page []
  (html5
    [:head
     [:meta {:charset "UTF-8"}]
     [:meta {:name "viewport" :content "width=device-width, initial-scale=1.0"}]
     [:title "PDF Viewer"]
     [:link {:rel "preconnect" :href "https://fonts.googleapis.com"}]
     [:link {:rel "preconnect" :href "https://fonts.gstatic.com" :crossorigin ""}]
     [:link {:rel "stylesheet" :href "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap"}]
     (include-css "/assets/pdf-viewer.css")]
    [:body
     [:div#loadingOverlay
      [:h2 "Loading PDF"]
      [:div.spinner]
      [:p#loadingMsg "Initialising renderer…"]]

     [:div#app
      [:div#topbar
       [:span.link ""]                                      ;;TODO populate
       [:div.sep]
       [:div.zoom-ctrl
        [:button {:id "zoomOut" :title "Zoom out"} "−"]
        [:span#zoomLevel "100%"]
        [:button {:id "zoomIn" :title "Zoom in"} "+"]]]

      [:div#sidebar]
      [:div#viewer
       [:div#emptyState
        [:span "◈"]
        [:p "No pages found"]]]]

     [:script {:src "/assets/pdf/pdf.mjs" :type "module"}]
     [:script {:src "/assets/pdf-viewer.js" :type "module"}]]))


(defn handle-view [_]
  (-> (resp/response (viewer-page))
      (resp/content-type "text/html; charset=utf-8")))


(def app
  (->
    (reitit-ring/ring-handler
      (reitit-ring/router
        [
         ["/" {:get handle-view}]
         ["/assets/*" (reitit-ring/create-resource-handler)]])
      (reitit-ring/create-default-handler))
    (wrap-multipart-params)
    (wrap-defaults (-> site-defaults
                       (assoc-in [:security :anti-forgery] false)))))


(defn -main [& args]
  (let [port (Integer/parseInt (or (System/getenv "PORT") "3000"))]
    (println (str "Starting PDF Viewer on http://localhost:" port))
    (jetty/run-jetty app {:port port :join? true})))
