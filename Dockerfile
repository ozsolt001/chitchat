# frontend build
FROM node:20 AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# backend build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish ChatApp.Backend/ChatApp.Backend.csproj -c Release -o /app/publish

# runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
# copy frontend built files into static webroot
RUN mkdir -p /app/wwwroot
COPY --from=frontend-build /frontend/dist /app/wwwroot
EXPOSE 8080
ENTRYPOINT ["dotnet", "ChatApp.Backend.dll"]
