<?php

if ($_SERVER["REQUEST_METHOD"] == "POST") {

  # BEGIN Setting reCaptcha v3 validation data
  $url = "https://www.google.com/recaptcha/api/siteverify";
  $data = [
    'secret' => "6LcqdyUcAAAAAG3zJHVSfOOnn6fmbYgsfKyKkqUG",
    'response' => $_POST['token'],
    'remoteip' => $_SERVER['REMOTE_ADDR']
  ];

  $options = array(
    'http' => array(
      'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
      'method'  => 'POST',
      'content' => http_build_query($data)
    )
    );
  
  # Creates and returns stream context with options supplied in options preset 
  $context  = stream_context_create($options);
  # file_get_contents() is the preferred way to read the contents of a file into a string
  $response = file_get_contents($url, false, $context);
  # Takes a JSON encoded string and converts it into a PHP variable
  $res = json_decode($response, true);
  # END setting reCaptcha v3 validation data
   
    // print_r($response); 
# Post form OR output alert and bypass post if false. NOTE: score conditional is optional
# since the successful score default is set at >= 0.5 by Google. Some developers want to
# be able to control score result conditions, so I included that in this example.

  if ($res['success'] == true && $res['score'] >= 0.5) {
 
    # Recipient email
    $mail_to = "info@greigmcmahon.com";
    
    # Sender form data
    $subject = trim($_POST["subject"]);
    $name = str_replace(array("\r","\n"),array(" "," ") , strip_tags(trim($_POST["name"])));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $phone = trim($_POST["phone"]);
    $message = trim($_POST["message"]);
    
    if (empty($name) OR !filter_var($email, FILTER_VALIDATE_EMAIL) OR empty($phone) OR empty($subject) OR empty($message)) {
      # Set a 400 (bad request) response code and exit
      http_response_code(400);
      echo '<p class="alert-warning">Please complete the form and try again.</p>';
      exit;
    }

    # Mail content
    $content = "Name: $name\n";
    $content .= "Email: $email\n\n";
    $content .= "Phone: $phone\n";
    $content .= "subject: $subject\n";
    $content .= "Message: $message\n";

    # Email headers
    $headers = "From: $name <$email>";

    # Send the email
    $success = mail($mail_to, $subject, $content, $headers);
    
    if ($success) {
      # Set a 200 (okay) response code
      http_response_code(200);
      echo '<p class="alert alert-success">Thank You! Your message has been successfully sent.</p>';
    } else {
      # Set a 500 (internal server error) response code
      http_response_code(500);
      echo '<p class="alert alert-warning">Something went wrong, your message could not be sent.</p>';
    }   

  } else {

    echo '<div class="alert alert-danger">
        Error! The security token has expired or you are a bot.
       </div>';
  }  

} else {
  # Not a POST request, set a 403 (forbidden) response code
  http_response_code(403);
  echo '<p class="alert-warning">There was a problem with your submission, please try again.</p>';
} ?>