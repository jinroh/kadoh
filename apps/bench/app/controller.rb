require 'dm-serializer'
require 'sinatra'

class Controller < Sinatra::Base

  set :static, true
  set :public_folder, PUBLIC_DIR

  get '/' do
    send_file File.join(PUBLIC_DIR, 'index.html')
  end

  get '/dist/KadOH.js' do
    content_type 'application/javascript'
    send_file File.join(KADOH_DIR, 'dist', 'KadOH.js')
  end

  get '/results' do
    results = Result.all
    results &= Result.all(:type => params[:type]) if (params[:type])
    results &= Result.all(:user_agent.like => '%' + params[:user_agent] + '%') if (params[:user_agent])
    results &= Result.all(:dht_size => params[dht_size].to_i) if (params[:dht_size])
    results.to_json
  end

  post '/results' do
    user_agent = request.user_agent
    dht_size   = ENV['DHT_SIZE'].to_i || 100

    data = JSON.parse(request.body.read)
    data.each do |type, results|
      results.each do |val|
        result = Result.new(val)
        result.attributes = {
          :type       => type,
          :user_agent => user_agent,
          :dht_size   => dht_size,
          :created_at => Time.now
        }
        result.save
      end
    end

    "OK"
  end

end
