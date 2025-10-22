FROM nginx:alpine

# Copy the static front files into nginx html folder
COPY src/ /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose nginx default HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]