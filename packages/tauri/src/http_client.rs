use std::str::FromStr;

use async_trait::async_trait;
use futures_util::stream::TryStreamExt;
use http_client::{
    http_types::{
        headers::{HeaderName, HeaderValue},
        Response, StatusCode,
    },
    Body, Error, HttpClient, Request,
};
use tokio_util::{compat::TokioAsyncReadCompatExt, io::StreamReader};

/// Implements the [HttpClient] trait by wrapping a [reqwest::Client].
#[derive(Default, Debug)]
pub struct TauriHttpClient {
    client: reqwest::Client,
}

#[async_trait]
impl HttpClient for TauriHttpClient {
    async fn send(&self, req: Request) -> Result<Response, Error> {
        let mut pending_request = self.client.request(
            reqwest::Method::from_str(req.method().as_ref()).map_err(|_| {
                Error::from_str(
                    StatusCode::MethodNotAllowed,
                    "reqwest does not support request method",
                )
            })?,
            req.url().as_str(),
        );

        for (key, value) in req.iter() {
            // We can unwrap here because we know key and header values are valid.
            pending_request = pending_request.header(
                reqwest::header::HeaderName::from_str(key.as_str())?,
                reqwest::header::HeaderValue::from_str(value.as_str())?,
            );
        }

        let inner_response = pending_request.send().await?;
        let mut response = Response::new(StatusCode::try_from(inner_response.status().as_u16())?);
        let mut content_length = None::<usize>;
        for (key, value) in inner_response.headers() {
            response.append_header(
                HeaderName::from_str(key.as_str())?,
                HeaderValue::from_bytes(value.as_bytes().into())?,
            );

            if key == "content-length" {
                content_length = Some(value.to_str()?.parse()?);
            }
        }

        let reader = StreamReader::new(
            inner_response
                .bytes_stream()
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)),
        );
        let body = Body::from_reader(reader.compat(), content_length);
        response.set_body(body);

        Ok(response)
    }
}
